import { Repository } from 'typeorm';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { parseAdminEmails } from '../../config/admin-emails.js';
import { MailService } from '../../mail/mail.service.js';
import { buildAuthorizationLostEmail } from './authorization-lost-email.template.js';
import { MERCADO_LIBRE_TOKEN_ID, MercadoLibreToken } from './entities/mercado-libre-token.entity.js';

const NOTIFICATION_INTERVAL = '24 hours';

@Injectable()
export class AuthorizationLostNotifier {
  private readonly logger = new Logger(AuthorizationLostNotifier.name);
  private readonly adminEmails: string[];

  constructor(
    @InjectRepository(MercadoLibreToken)
    private readonly tokenRepository: Repository<MercadoLibreToken>,

    private readonly mailService: MailService,
    configService: ConfigService,
  ) {
    this.adminEmails = parseAdminEmails(configService.get<string>('ADMIN_EMAILS', ''));
  }

  notifyInBackground(): void {
    this.notify().catch((error: unknown) => {
      this.logger.error(`No se pudo avisar a los administradores: ${(error as Error).message}`);
    });
  }

  async notify(): Promise<void> {
    if (this.adminEmails.length === 0) {
      this.logger.warn('Se perdió la autorización de Mercado Libre y ADMIN_EMAILS está vacía: no se avisa a nadie');
      return;
    }
    if (!(await this.claim())) return;

    try {
      for (const to of this.adminEmails) await this.mailService.send({ to, ...buildAuthorizationLostEmail() });
      this.logger.log(`Aviso de autorización perdida enviado a ${this.adminEmails.length} administrador(es)`);
    } catch (error) {
      await this.tokenRepository.update(MERCADO_LIBRE_TOKEN_ID, { authorizationLostNotifiedAt: null });
      throw error;
    }
  }

  private async claim(): Promise<boolean> {
    const { affected } = await this.tokenRepository
      .createQueryBuilder()
      .update()
      .set({ authorizationLostNotifiedAt: () => 'now()' })
      .where('id = :id', { id: MERCADO_LIBRE_TOKEN_ID })
      .andWhere(
        `(authorization_lost_notified_at IS NULL OR authorization_lost_notified_at < now() - interval '${NOTIFICATION_INTERVAL}')`,
      )
      .execute();
    return Boolean(affected);
  }
}
