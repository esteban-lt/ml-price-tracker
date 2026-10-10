import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';

import { PriceRefreshService } from './price-refresh.service.js';

const JOB_NAME = 'price-refresh';
const MINUTE_IN_MS = 60 * 1000;

@Injectable()
export class PriceRefreshScheduler implements OnModuleInit {
  private readonly logger = new Logger(PriceRefreshScheduler.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly priceRefreshService: PriceRefreshService,
  ) {}

  onModuleInit(): void {
    if (!this.configService.getOrThrow<boolean>('PRICE_REFRESH_ENABLED')) {
      this.logger.log('La actualización automática de precios está desactivada');
      return;
    }

    const minutes = this.configService.getOrThrow<number>('PRICE_REFRESH_INTERVAL_MINUTES');
    const interval = setInterval(() => void this.priceRefreshService.run(), minutes * MINUTE_IN_MS);

    this.schedulerRegistry.addInterval(JOB_NAME, interval);
    this.logger.log(`Actualización automática de precios programada cada ${minutes} minutos`);
  }
}
