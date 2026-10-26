import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MailModule } from '../../mail/mail.module.js';
import { MercadoLibreCircuitBreaker } from '../mercado-libre-circuit-breaker.js';
import { MercadoLibreHttpModule } from '../mercado-libre-http.module.js';
import { AuthorizationLostNotifier } from './authorization-lost-notifier.js';
import { MercadoLibreToken } from './entities/mercado-libre-token.entity.js';
import { MercadoLibreAuthService } from './mercado-libre-auth.service.js';

@Module({
  imports: [MercadoLibreHttpModule, TypeOrmModule.forFeature([MercadoLibreToken]), MailModule],
  providers: [MercadoLibreAuthService, MercadoLibreCircuitBreaker, AuthorizationLostNotifier],
  exports: [MercadoLibreAuthService, MercadoLibreCircuitBreaker],
})
export class MercadoLibreAuthModule {}
