import { Module } from '@nestjs/common';
import { MercadoLibreAuthModule } from './auth/mercado-libre-auth.module.js';
import { MercadoLibreApiModule } from './api/mercado-libre-api.module.js';
import { MercadoLibreController } from './mercado-libre.controller.js';

@Module({
  imports: [MercadoLibreAuthModule, MercadoLibreApiModule],
  controllers: [MercadoLibreController],
})
export class MercadoLibreModule {}
