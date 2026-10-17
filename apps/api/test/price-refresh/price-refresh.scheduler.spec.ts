import { SchedulerRegistry } from '@nestjs/schedule';

import { PriceRefreshScheduler } from '../../src/price-refresh/price-refresh.scheduler.js';

const config = (enabled: boolean) => ({
  getOrThrow: (key: string) => (key === 'PRICE_REFRESH_ENABLED' ? enabled : 60),
});

describe('PriceRefreshScheduler (interruptor)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('desactivado no programa el job', () => {
    const registry = new SchedulerRegistry();
    const job = { run: vi.fn() };

    new PriceRefreshScheduler(config(false) as never, registry, job as never).onModuleInit();
    vi.advanceTimersByTime(24 * 60 * 60 * 1000);

    expect(registry.getIntervals()).toHaveLength(0);
    expect(job.run).not.toHaveBeenCalled();
  });

  it('activado corre el job en cada intervalo configurado', () => {
    const registry = new SchedulerRegistry();
    const job = { run: vi.fn() };

    new PriceRefreshScheduler(config(true) as never, registry, job as never).onModuleInit();
    vi.advanceTimersByTime(2 * 60 * 60 * 1000);

    expect(job.run).toHaveBeenCalledTimes(2);
    clearInterval(registry.getInterval('price-refresh'));
  });
});
