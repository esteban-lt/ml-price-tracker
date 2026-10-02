import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MercadoLibreAuthService } from './mercado-libre-auth.service.js';

@Module({
  imports: [HttpModule],
  providers: [MercadoLibreAuthService],
  exports: [MercadoLibreAuthService],
})
export class MercadoLibreAuthModule {}
