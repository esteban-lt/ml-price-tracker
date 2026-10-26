import { CronJob } from 'cron';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';

import { PriceRefreshService } from './price-refresh.service.js';

const JOB_NAME = 'price-refresh';

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

    const cronTime = this.configService.getOrThrow<string>('PRICE_REFRESH_CRON');
    const timeZone = this.configService.getOrThrow<string>('PRICE_REFRESH_TIMEZONE');
    const job = CronJob.from({ cronTime, timeZone, onTick: () => void this.priceRefreshService.run() });

    this.schedulerRegistry.addCronJob(JOB_NAME, job);
    job.start();
    this.logger.log(`Actualización automática de precios programada con "${cronTime}" (${timeZone})`);
  }
}
