import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';

import { AlertDispatchService } from './alert-dispatch.service.js';

const JOB_NAME = 'alert-dispatch';
const INTERVAL_MS = 5 * 60 * 1000;

@Injectable()
export class AlertDispatchScheduler implements OnModuleInit {
  private readonly logger = new Logger(AlertDispatchScheduler.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly alertDispatchService: AlertDispatchService,
  ) {}

  // Comparte el interruptor del job de precios: sin él no se generan alertas nuevas que enviar.
  onModuleInit(): void {
    if (!this.configService.getOrThrow<boolean>('PRICE_REFRESH_ENABLED')) {
      this.logger.log('El envío de alertas por correo está desactivado (PRICE_REFRESH_ENABLED=false)');
      return;
    }

    const interval = setInterval(() => void this.alertDispatchService.run(), INTERVAL_MS);

    this.schedulerRegistry.addInterval(JOB_NAME, interval);
    this.logger.log('Envío de alertas por correo programado cada 5 minutos');
  }
}
