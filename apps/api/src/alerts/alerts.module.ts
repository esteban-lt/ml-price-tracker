import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PriceHistory } from '../price-history/entities/price-history.entity.js';
import { TrackedProduct } from '../tracked-products/entities/tracked-product.entity.js';
import { AlertDetectionService } from './alert-detection.service.js';
import { AlertsController } from './alerts.controller.js';
import { AlertsService } from './alerts.service.js';
import { Alert } from './entities/alert.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Alert, TrackedProduct, PriceHistory])],
  controllers: [AlertsController],
  providers: [AlertsService, AlertDetectionService],
  exports: [AlertDetectionService],
})
export class AlertsModule {}
