import { SchedulerRegistry } from '@nestjs/schedule';

import { AlertDispatchScheduler } from '../../src/alerts/alert-dispatch.scheduler.js';

// El envío de alertas comparte el interruptor PRICE_REFRESH_ENABLED con el job de precios.
const config = (enabled: boolean) => ({ getOrThrow: () => enabled });

describe('AlertDispatchScheduler (interruptor)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('desactivado no programa el envío', () => {
    const registry = new SchedulerRegistry();
    const dispatcher = { run: vi.fn() };

    new AlertDispatchScheduler(config(false) as never, registry, dispatcher as never).onModuleInit();
    vi.advanceTimersByTime(60 * 60 * 1000);

    expect(registry.getIntervals()).toHaveLength(0);
    expect(dispatcher.run).not.toHaveBeenCalled();
  });

  it('activado corre el envío cada 5 minutos', () => {
    const registry = new SchedulerRegistry();
    const dispatcher = { run: vi.fn() };

    new AlertDispatchScheduler(config(true) as never, registry, dispatcher as never).onModuleInit();
    vi.advanceTimersByTime(15 * 60 * 1000);

    expect(dispatcher.run).toHaveBeenCalledTimes(3);
    clearInterval(registry.getInterval('alert-dispatch'));
  });
});
