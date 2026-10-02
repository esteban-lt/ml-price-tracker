import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

const AUTHORIZATION_URL = 'https://auth.mercadolibre.com.mx/authorization';
const TOKEN_URL = 'https://api.mercadolibre.com/oauth/token';
const SAFETY_MARGIN_MS = 60_000;

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // seconds
  scope: string;
  user_id: number;
  refresh_token?: string;
}

interface StoredTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // epoch ms
  user_id: number;
  scope: string;
}

export interface MercadoLibreAuthStatus {
  authorized: boolean;
  user_id?: number;
  scope?: string;
  access_token_expires_at?: string;
}

/**
 * Flujo Authorization Code de Mercado Libre.
 *
 * 1. Abrir una vez la URL de getAuthorizationUrl() y autorizar con una cuenta real.
 * 2. Intercambiar el `code` del callback con exchangeCode().
 * 3. Los tokens se guardan en ML_TOKENS_FILE y el access_token se renueva solo con el
 *    refresh_token. En Mercado Libre el refresh_token es de un solo uso: cada renovación
 *    devuelve uno nuevo, por eso se persiste en archivo y no en .env.
 */
@Injectable()
export class MercadoLibreAuthService {
  private readonly logger = new Logger(MercadoLibreAuthService.name);
  private readonly tokensFile: string;
  private tokens: StoredTokens | null = null;
  private tokensLoaded = false;
  private refreshInFlight: Promise<string> | null = null;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.tokensFile = resolve(this.configService.getOrThrow<string>('ML_TOKENS_FILE'));
  }

  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.configService.getOrThrow<string>('ML_CLIENT_ID'),
      redirect_uri: this.configService.getOrThrow<string>('ML_REDIRECT_URI'),
    });
    return `${AUTHORIZATION_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<MercadoLibreAuthStatus> {
    const data = await this.requestToken(
      {
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.configService.getOrThrow<string>('ML_REDIRECT_URI'),
      },
      'No se pudo intercambiar el code por un token de Mercado Libre',
    );

    if (!data.refresh_token) {
      this.logger.warn(
        'Mercado Libre no devolvió refresh_token: revisa que el flujo Refresh Token (offline_access) esté activo en el DevCenter',
      );
    }

    await this.saveTokens(data, data.refresh_token ?? '');
    return this.getStatus();
  }

  async getStatus(): Promise<MercadoLibreAuthStatus> {
    const tokens = await this.loadTokens();
    if (!tokens) return { authorized: false };

    return {
      authorized: true,
      user_id: tokens.user_id,
      scope: tokens.scope,
      access_token_expires_at: new Date(tokens.expires_at).toISOString(),
    };
  }

  async getValidToken(): Promise<string> {
    const tokens = await this.loadTokens();
    if (!tokens) {
      throw new ServiceUnavailableException(
        'Mercado Libre no está autorizado: abre GET /mercado-libre/auth/url y luego POST /mercado-libre/auth/exchange con el code',
      );
    }

    if (Date.now() < tokens.expires_at) return tokens.access_token;
    return this.refreshAccessToken();
  }

  invalidateAccessToken(): void {
    if (this.tokens) this.tokens.expires_at = 0;
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
    const current = this.tokens!;
    if (!current.refresh_token) {
      throw new ServiceUnavailableException(
        'El token de Mercado Libre expiró y no hay refresh_token: vuelve a autorizar con GET /mercado-libre/auth/url',
      );
    }

    this.logger.log('Renovando access_token de Mercado Libre con refresh_token');
    const data = await this.requestToken(
      { grant_type: 'refresh_token', refresh_token: current.refresh_token },
      'No se pudo renovar el token de Mercado Libre: vuelve a autorizar con GET /mercado-libre/auth/url',
    );

    await this.saveTokens(data, data.refresh_token ?? current.refresh_token);
    return data.access_token;
  }

  private async requestToken(
    params: Record<string, string>,
    errorMessage: string,
  ): Promise<TokenResponse> {
    const body = new URLSearchParams({
      ...params,
      client_id: this.configService.getOrThrow<string>('ML_CLIENT_ID'),
      client_secret: this.configService.getOrThrow<string>('ML_CLIENT_SECRET'),
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post<TokenResponse>(TOKEN_URL, body.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
        }),
      );
      return response.data;
    } catch (error) {
      const detail = JSON.stringify((error as { response?: { data?: unknown } }).response?.data ?? String(error));
      this.logger.error(`${errorMessage} (${params.grant_type}): ${detail}`);
      throw new ServiceUnavailableException(errorMessage);
    }
  }

  private async loadTokens(): Promise<StoredTokens | null> {
    if (this.tokensLoaded) return this.tokens;

    try {
      this.tokens = JSON.parse(await readFile(this.tokensFile, 'utf8')) as StoredTokens;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.logger.error(`No se pudo leer ${this.tokensFile}`, error);
      }
      this.tokens = null;
    }

    this.tokensLoaded = true;
    return this.tokens;
  }

  private async saveTokens(data: TokenResponse, refreshToken: string): Promise<void> {
    this.tokens = {
      access_token: data.access_token,
      refresh_token: refreshToken,
      expires_at: Date.now() + data.expires_in * 1000 - SAFETY_MARGIN_MS,
      user_id: data.user_id,
      scope: data.scope,
    };
    this.tokensLoaded = true;

    await writeFile(this.tokensFile, JSON.stringify(this.tokens, null, 2), 'utf8');
  }
}
