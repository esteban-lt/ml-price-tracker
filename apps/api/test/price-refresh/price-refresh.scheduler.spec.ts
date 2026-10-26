import { SchedulerRegistry } from '@nestjs/schedule';

import { PriceRefreshScheduler } from '../../src/price-refresh/price-refresh.scheduler.js';

const HOUR_MS = 60 * 60 * 1000;
const config = (enabled: boolean) => ({
  getOrThrow: (key: string) =>
    ({
      PRICE_REFRESH_ENABLED: enabled,
      PRICE_REFRESH_CRON: '0 0,6,12,18 * * *',
      PRICE_REFRESH_TIMEZONE: 'America/Mexico_City',
    })[key],
});

describe('PriceRefreshScheduler (horario fijo)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('desactivado no programa el job', () => {
    const registry = new SchedulerRegistry();
    const job = { run: vi.fn() };

    new PriceRefreshScheduler(config(false) as never, registry, job as never).onModuleInit();
    vi.advanceTimersByTime(24 * HOUR_MS);

    expect(registry.getCronJobs().size).toBe(0);
    expect(job.run).not.toHaveBeenCalled();
  });

  it('corre a las 6, 12, 18 y 0 horas de la Ciudad de México, sin importar cuándo arrancó', () => {
    vi.setSystemTime(new Date('2026-10-26T11:40:00Z'));
    const registry = new SchedulerRegistry();
    const job = { run: vi.fn() };

    new PriceRefreshScheduler(config(true) as never, registry, job as never).onModuleInit();

    vi.advanceTimersByTime(19 * 60 * 1000);
    expect(job.run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2 * 60 * 1000);
    expect(job.run).toHaveBeenCalledTimes(1);
    expect(new Date().getUTCHours()).toBe(12);

    vi.advanceTimersByTime(24 * HOUR_MS);
    expect(job.run).toHaveBeenCalledTimes(5);
    registry.getCronJob('price-refresh').stop();
  });
});
