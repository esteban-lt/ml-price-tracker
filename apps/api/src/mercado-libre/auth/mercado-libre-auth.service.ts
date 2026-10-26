import { Repository } from 'typeorm';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { firstValueFrom } from 'rxjs';

import { describeMercadoLibreError, formatMercadoLibreError } from '../mercado-libre-error.js';
import { MercadoLibreCircuitBreaker, MercadoLibreUnavailableException } from '../mercado-libre-circuit-breaker.js';
import { isServiceFailure } from '../mercado-libre-retry-policy.js';
import { AuthorizationLostNotifier } from './authorization-lost-notifier.js';
import { MERCADO_LIBRE_TOKEN_ID, MercadoLibreToken } from './entities/mercado-libre-token.entity.js';

const AUTHORIZATION_URL = 'https://auth.mercadolibre.com.mx/authorization';
const TOKEN_URL = 'https://api.mercadolibre.com/oauth/token';
const SAFETY_MARGIN_MS = 60_000;
const REAUTHORIZE_HINT = 'vuelve a autorizar con GET /mercado-libre/auth/url';

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // seconds
  scope: string;
  user_id: number;
  refresh_token?: string;
}

interface AccessToken {
  value: string;
  expiresAt: number; // epoch ms
}

export interface MercadoLibreAuthStatus {
  authorized: boolean;
  access_token_expires_at?: string;
}

// Fallo de /oauth/token con solo el código de error de Mercado Libre (p. ej. invalid_grant).
class TokenRequestError extends Error {
  constructor(readonly code: string | undefined) {
    super(`Mercado Libre rechazó la petición de token${code ? ` (${code})` : ''}`);
  }
}

/**
 * Flujo Authorization Code de Mercado Libre.
 *
 * 1. Un administrador abre una vez la URL de getAuthorizationUrl() y autoriza con una cuenta real.
 * 2. Intercambia el `code` del callback con exchangeCode().
 * 3. Solo el refresh_token se guarda en la tabla mercado_libre_token (una única fila). El
 *    access_token vive en memoria y se renueva con el refresh_token cuando falta o está por
 *    expirar. En Mercado Libre el refresh_token es de un solo uso: cada renovación devuelve
 *    uno nuevo que se guarda de inmediato.
 */
@Injectable()
export class MercadoLibreAuthService {
  private readonly logger = new Logger(MercadoLibreAuthService.name);
  private accessToken: AccessToken | null = null;
  private refreshInFlight: Promise<string> | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRepository(MercadoLibreToken)
    private readonly tokenRepository: Repository<MercadoLibreToken>,
    private readonly circuitBreaker: MercadoLibreCircuitBreaker,
    private readonly authorizationLostNotifier: AuthorizationLostNotifier,
  ) {}

  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.configService.getOrThrow<string>('ML_CLIENT_ID'),
      redirect_uri: this.configService.getOrThrow<string>('ML_REDIRECT_URI'),
    });
    return `${AUTHORIZATION_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<MercadoLibreAuthStatus> {
    let data: TokenResponse;
    try {
      data = await this.requestToken({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.configService.getOrThrow<string>('ML_REDIRECT_URI'),
      });
    } catch {
      throw new ServiceUnavailableException('No se pudo intercambiar el code por un token de Mercado Libre');
    }

    if (!data.refresh_token) {
      throw new ServiceUnavailableException(
        'Mercado Libre no devolvió refresh_token: revisa que el flujo Refresh Token (offline_access) esté activo en el DevCenter',
      );
    }

    await this.storeTokens(data, data.refresh_token);
    return this.getStatus();
  }

  async getStatus(): Promise<MercadoLibreAuthStatus> {
    const authorized = await this.tokenRepository.existsBy({ id: MERCADO_LIBRE_TOKEN_ID });

    return {
      authorized,
      access_token_expires_at: this.accessToken
        ? new Date(this.accessToken.expiresAt).toISOString()
        : undefined,
    };
  }

  async getValidToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.accessToken.expiresAt - SAFETY_MARGIN_MS) {
      return this.accessToken.value;
    }
    return this.refreshAccessToken();
  }

  invalidateAccessToken(): void {
    this.accessToken = null;
  }

  // Varias peticiones simultáneas pueden encontrar el token expirado; como el
  // refresh_token es de un solo uso, todas comparten la misma renovación.
  private refreshAccessToken(): Promise<string> {
    this.refreshInFlight ??= this.doRefresh().finally(() => {
      this.refreshInFlight = null;
    });
    return this.refreshInFlight;
  }

  private async doRefresh(): Promise<string> {
    const refreshToken = await this.loadRefreshToken();
    if (!refreshToken) {
      throw this.unavailable(
        'Mercado Libre no está autorizado: un administrador debe abrir GET /mercado-libre/auth/url y luego POST /mercado-libre/auth/exchange con el code',
      );
    }

    try {
      return await this.refreshWith(refreshToken);
    } catch (error) {
      if (!(error instanceof TokenRequestError && error.code === 'invalid_grant')) {
        throw this.unavailable('No se pudo renovar el token de Mercado Libre; se reintentará en la siguiente petición');
      }
    }

    // Otra instancia (p. ej. durante un despliegue) pudo renovar justo antes e invalidar el que leímos.
    const latest = await this.loadRefreshToken();
    if (!latest || latest === refreshToken) {
      throw this.authorizationLost(`El refresh_token de Mercado Libre ya no es válido: ${REAUTHORIZE_HINT}`);
    }

    this.logger.warn('El refresh_token cambió en la base durante la renovación; se reintenta una vez con el nuevo');
    try {
      return await this.refreshWith(latest);
    } catch (error) {
      const message = `No se pudo renovar el token de Mercado Libre: ${REAUTHORIZE_HINT}`;
      if (error instanceof TokenRequestError && error.code === 'invalid_grant') throw this.authorizationLost(message);
      throw this.unavailable(message);
    }
  }

  private authorizationLost(logMessage: string): ServiceUnavailableException {
    this.authorizationLostNotifier.notifyInBackground();
    return this.unavailable(logMessage);
  }

  // El detalle (incluidas las instrucciones de reautorización) va al log; el cliente solo ve un 503 genérico.
  private unavailable(logMessage: string): ServiceUnavailableException {
    this.logger.error(logMessage);
    return new MercadoLibreUnavailableException();
  }

  private async refreshWith(refreshToken: string): Promise<string> {
    this.logger.log('Renovando access_token de Mercado Libre con refresh_token');
    const data = await this.requestToken({ grant_type: 'refresh_token', refresh_token: refreshToken });

    await this.storeTokens(data, data.refresh_token ?? refreshToken);
    return data.access_token;
  }

  private async requestToken(params: Record<string, string>): Promise<TokenResponse> {
    const body = new URLSearchParams({
      ...params,
      client_id: this.configService.getOrThrow<string>('ML_CLIENT_ID'),
      client_secret: this.configService.getOrThrow<string>('ML_CLIENT_SECRET'),
    });

    this.circuitBreaker.assertClosed();
    try {
      const response = await firstValueFrom(
        this.httpService.post<TokenResponse>(TOKEN_URL, body.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
        }),
      );
      this.circuitBreaker.recordSuccess();
      return response.data;
    } catch (error) {
      const detail = describeMercadoLibreError(error);
      if (isServiceFailure(detail)) this.circuitBreaker.recordFailure();
      this.logger.error(formatMercadoLibreError('POST', `/oauth/token (${params.grant_type})`, detail));
      throw new TokenRequestError(detail.code);
    }
  }

  private async loadRefreshToken(): Promise<string | null> {
    const row = await this.tokenRepository.findOneBy({ id: MERCADO_LIBRE_TOKEN_ID });
    return row?.refreshToken ?? null;
  }

  // El refresh_token se guarda antes de usar el access_token: el anterior ya dejó de servir.
  private async storeTokens(data: TokenResponse, refreshToken: string): Promise<void> {
    try {
      await this.tokenRepository.upsert(
        { id: MERCADO_LIBRE_TOKEN_ID, refreshToken, authorizationLostNotifiedAt: null },
        ['id'],
      );
    } catch (error) {
      this.logger.error(
        `No se pudo guardar el refresh_token de Mercado Libre en la base (${(error as Error).message}). ` +
          `El access_token en memoria sigue siendo válido, pero al expirar o reiniciar la app habrá que ${REAUTHORIZE_HINT}`,
      );
    }

    this.accessToken = {
      value: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
  }
}
