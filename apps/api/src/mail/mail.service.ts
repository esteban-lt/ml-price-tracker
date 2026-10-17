import { Resend } from 'resend';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// Límite de peticiones por segundo o cuota diaria/mensual agotada: conviene dejar de enviar por ahora.
export class MailRateLimitError extends Error {}

const RATE_LIMIT_ERRORS = new Set(['rate_limit_exceeded', 'daily_quota_exceeded', 'monthly_quota_exceeded']);

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;

  constructor(configService: ConfigService) {
    const apiKey = configService.get<string>('RESEND_API_KEY');
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.from = configService.getOrThrow<string>('MAIL_FROM');

    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY no está definida: los correos se registran en el log en lugar de enviarse');
    }
  }

  // Lanza MailRateLimitError ante límite o cuota de Resend, y Error con un mensaje seguro ante cualquier otro fallo.
  async send({ to, subject, html, text }: MailMessage): Promise<void> {
    if (!this.resend) {
      this.logger.log(`Correo no enviado (sin RESEND_API_KEY) para ${to} - ${subject}\n${text}`);
      return;
    }

    const { error } = await this.resend.emails.send({ from: this.from, to, subject, html, text });
    if (!error) return;

    const detail = `Resend respondió ${error.statusCode ?? 'sin respuesta'} - ${error.name}: ${error.message}`;
    if (RATE_LIMIT_ERRORS.has(error.name)) throw new MailRateLimitError(detail);
    throw new Error(detail);
  }
}
