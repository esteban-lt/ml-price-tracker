import { setTimeout as sleep } from 'node:timers/promises';
import { Repository } from 'typeorm';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { listUnsubscribeHeaders } from '../mail/list-unsubscribe.js';
import { MailRateLimitError, MailService } from '../mail/mail.service.js';
import { EmailUnsubscribeTokenService } from '../users/email-unsubscribe-token.service.js';
import { buildAlertEmail } from './alert-email.template.js';
import { Alert, AlertStatusEnum } from './entities/alert.entity.js';

const MAX_ATTEMPTS = 3;
const MAX_ALERTS_PER_RUN = 50;
const MAX_ALERT_AGE = '24 hours';
// Resend admite pocas peticiones por segundo; los envíos van en serie con esta pausa.
const DELAY_BETWEEN_SENDS_MS = 600;

interface DispatchSummary {
  sent: number;
  skipped: number;
  failed: number;
  retrying: number;
}

type SendOutcome = 'sent' | 'failed' | 'retrying' | 'rate-limited' | 'claimed-elsewhere';

@Injectable()
export class AlertDispatchService {
  private readonly logger = new Logger(AlertDispatchService.name);
  private readonly frontendUrl: string;
  private readonly apiUrl: string;
  private isRunning = false;

  constructor(
    @InjectRepository(Alert)
    private readonly alertRepository: Repository<Alert>,

    private readonly mailService: MailService,
    private readonly emailUnsubscribeTokenService: EmailUnsubscribeTokenService,
    configService: ConfigService,
  ) {
    this.frontendUrl = withoutTrailingSlash(configService.getOrThrow<string>('FRONTEND_URL'));
    this.apiUrl = withoutTrailingSlash(configService.getOrThrow<string>('API_URL'));
  }

  async run(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('El envío anterior sigue en curso; se omite esta corrida');
      return;
    }

    this.isRunning = true;
    try {
      await this.dispatchPending();
    } catch (error) {
      this.logger.error(`El envío de alertas falló: ${(error as Error).message}`);
    } finally {
      this.isRunning = false;
    }
  }

  private async dispatchPending(): Promise<void> {
    const summary: DispatchSummary = { sent: 0, skipped: 0, failed: 0, retrying: 0 };
    summary.skipped = (await this.skipExpired()) + (await this.skipUsersWithoutEmail());

    const alerts = await this.alertRepository.find({
      where: { status: AlertStatusEnum.PENDING },
      relations: { priceHistory: true, trackedProduct: { product: true, user: true } },
      order: { createdAt: 'ASC' },
      take: MAX_ALERTS_PER_RUN,
    });

    for (const [index, alert] of alerts.entries()) {
      if (index > 0) await sleep(DELAY_BETWEEN_SENDS_MS);

      const outcome = await this.send(alert);
      if (outcome === 'rate-limited') {
        summary.retrying++;
        this.logger.warn('Resend alcanzó su límite de peticiones o su cuota; se detiene la corrida');
        break;
      }
      if (outcome !== 'claimed-elsewhere') summary[outcome]++;
    }

    if (alerts.length > 0 || summary.skipped > 0) {
      this.logger.log(
        `Envío de alertas terminado: ${summary.sent} enviadas, ${summary.skipped} omitidas, ` +
          `${summary.failed} fallidas, ${summary.retrying} pendientes por reintento`,
      );
    }
  }

  private async send(alert: Alert): Promise<SendOutcome> {
    const attempts = await this.claim(alert.id);
    if (attempts === null) return 'claimed-elsewhere';

    try {
      const { user } = alert.trackedProduct;
      const unsubscribeToken = encodeURIComponent(this.emailUnsubscribeTokenService.create(user.id));
      const email = buildAlertEmail(alert, {
        frontendUrl: this.frontendUrl,
        unsubscribeUrl: `${this.frontendUrl}/unsubscribe?token=${unsubscribeToken}`,
      });
      await this.mailService.send({
        to: user.email,
        ...email,
        headers: listUnsubscribeHeaders(`${this.apiUrl}/users/unsubscribe?token=${unsubscribeToken}`),
      });
      return 'sent';
    } catch (error) {
      if (error instanceof MailRateLimitError) {
        await this.releaseClaim(alert.id);
        return 'rate-limited';
      }

      const failed = attempts >= MAX_ATTEMPTS;
      this.logger.error(
        `No se pudo enviar la alerta ${alert.id} (intento ${attempts} de ${MAX_ATTEMPTS}): ${(error as Error).message}`,
      );
      await this.alertRepository.update(alert.id, {
        status: failed ? AlertStatusEnum.FAILED : AlertStatusEnum.PENDING,
      });
      return failed ? 'failed' : 'retrying';
    }
  }

  // Pasar de pending a sent en una sola operación garantiza que solo una instancia envíe cada alerta.
  // Si el envío falla, la alerta vuelve a pending (o pasa a failed).
  private async claim(id: string): Promise<number | null> {
    const result = await this.alertRepository
      .createQueryBuilder()
      .update()
      .set({ status: AlertStatusEnum.SENT, attempts: () => 'attempts + 1' })
      .where('id = :id AND status = :pending', { id, pending: AlertStatusEnum.PENDING })
      .returning('attempts')
      .execute();

    const [row] = result.raw as { attempts: number }[];
    return row?.attempts ?? null;
  }

  // Un límite de Resend no es culpa de la alerta: vuelve a pending sin que el intento cuente.
  private async releaseClaim(id: string): Promise<void> {
    await this.alertRepository
      .createQueryBuilder()
      .update()
      .set({ status: AlertStatusEnum.PENDING, attempts: () => 'attempts - 1' })
      .where('id = :id', { id })
      .execute();
  }

  // Evita correos viejos si el envío estuvo apagado o Resend caído.
  private skipExpired(): Promise<number> {
    return this.skipPendingWhere(`created_at < now() - interval '${MAX_ALERT_AGE}'`);
  }

  // Siguen visibles en la bandeja; solo no se envía el correo.
  private skipUsersWithoutEmail(): Promise<number> {
    return this.skipPendingWhere(
      `tracked_product_id IN (
        SELECT tracked.id FROM tracked_products tracked
        JOIN users ON users.id = tracked.user_id
        WHERE users.email_verified_at IS NULL OR NOT users.email_notifications
      )`,
    );
  }

  private async skipPendingWhere(condition: string): Promise<number> {
    const { affected } = await this.alertRepository
      .createQueryBuilder()
      .update()
      .set({ status: AlertStatusEnum.SKIPPED })
      .where('status = :pending', { pending: AlertStatusEnum.PENDING })
      .andWhere(condition)
      .execute();
    return affected ?? 0;
  }
}

function withoutTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}
