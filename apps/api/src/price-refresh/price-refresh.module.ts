import { Module } from '@nestjs/common';

import { AlertsModule } from '../alerts/alerts.module.js';
import { ProductsModule } from '../products/products.module.js';
import { TrackedProductsModule } from '../tracked-products/tracked-products.module.js';
import { PriceRefreshScheduler } from './price-refresh.scheduler.js';
import { PriceRefreshService } from './price-refresh.service.js';

@Module({
  imports: [ProductsModule, TrackedProductsModule, AlertsModule],
  providers: [PriceRefreshService, PriceRefreshScheduler],
})
export class PriceRefreshModule {}
