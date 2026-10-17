import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MercadoLibreToken } from './entities/mercado-libre-token.entity.js';
import { MercadoLibreAuthService } from './mercado-libre-auth.service.js';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([MercadoLibreToken])],
  providers: [MercadoLibreAuthService],
  exports: [MercadoLibreAuthService],
})
export class MercadoLibreAuthModule {}
