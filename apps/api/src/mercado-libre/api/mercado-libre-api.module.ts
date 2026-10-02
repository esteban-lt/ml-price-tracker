import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MercadoLibreAuthModule } from '../auth/mercado-libre-auth.module.js';
import { MercadoLibreApiService } from './mercado-libre-api.service.js';

@Module({
  imports: [HttpModule, MercadoLibreAuthModule],
  providers: [MercadoLibreApiService],
  exports: [MercadoLibreApiService],
})
export class MercadoLibreApiModule {}