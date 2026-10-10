import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Product } from '../products/entities/product.entity.js';
import { PriceHistory } from './entities/price-history.entity.js';
import { PriceHistoryController } from './price-history.controller.js';
import { PriceHistoryService } from './price-history.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([PriceHistory, Product])],
  controllers: [PriceHistoryController],
  providers: [PriceHistoryService],
  exports: [PriceHistoryService],
})
export class PriceHistoryModule {}
