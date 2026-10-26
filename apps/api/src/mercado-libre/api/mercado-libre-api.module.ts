import { Module } from '@nestjs/common';
import { MercadoLibreAuthModule } from '../auth/mercado-libre-auth.module.js';
import { MercadoLibreHttpModule } from '../mercado-libre-http.module.js';
import { MercadoLibreApiService } from './mercado-libre-api.service.js';

@Module({
  imports: [MercadoLibreHttpModule, MercadoLibreAuthModule],
  providers: [MercadoLibreApiService],
  exports: [MercadoLibreApiService],
})
export class MercadoLibreApiModule {}
