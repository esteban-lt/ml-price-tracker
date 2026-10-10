import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PriceHistoryModule } from '../price-history/price-history.module.js';
import { ProductsModule } from '../products/products.module.js';
import { TrackedProduct } from './entities/tracked-product.entity.js';
import { TrackedProductsController } from './tracked-products.controller.js';
import { TrackedProductsService } from './tracked-products.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([TrackedProduct]), ProductsModule, PriceHistoryModule],
  controllers: [TrackedProductsController],
  providers: [TrackedProductsService],
  exports: [TrackedProductsService],
})
export class TrackedProductsModule {}
