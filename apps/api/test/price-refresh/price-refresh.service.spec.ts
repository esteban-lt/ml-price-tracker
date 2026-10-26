import { Logger } from '@nestjs/common';

import { MercadoLibreUnavailableException } from '../../src/mercado-libre/mercado-libre-circuit-breaker.js';
import { PriceRefreshService } from '../../src/price-refresh/price-refresh.service.js';

describe('PriceRefreshService (corridas solapadas)', () => {
  it('omite una segunda ejecución mientras la primera sigue en curso', async () => {
    let finishFirstRun!: () => void;
    const trackedProductsService = {
      findProductsToRefresh: vi.fn(() => new Promise((resolve) => (finishFirstRun = () => resolve([])))),
    };
    const job = new PriceRefreshService(trackedProductsService as never, {} as never, {} as never);

    const first = job.run();
    await job.run();
    expect(trackedProductsService.findProductsToRefresh).toHaveBeenCalledTimes(1);

    finishFirstRun();
    await first;
    trackedProductsService.findProductsToRefresh.mockResolvedValue([]);
    await job.run();
    expect(trackedProductsService.findProductsToRefresh).toHaveBeenCalledTimes(2);
  });
});

describe('PriceRefreshService (resumen de la corrida)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('un producto que falla no detiene la corrida y queda en el resumen junto a los omitidos', async () => {
    const logged: string[] = [];
    vi.spyOn(Logger.prototype, 'log').mockImplementation((message: unknown) => void logged.push(String(message)));
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const products = ['MLM1', 'MLM2', 'MLM3', 'MLM4'].map((externalId) => ({ id: externalId, externalId }));
    const productsService = {
      refreshPrice: vi.fn(async ({ externalId }: { externalId: string }) => {
        if (externalId === 'MLM1') throw new Error('respuesta inesperada');
        if (externalId === 'MLM2') throw new MercadoLibreUnavailableException();
        return { outcome: 'unavailable' };
      }),
    };
    const job = new PriceRefreshService(
      { findProductsToRefresh: async () => products } as never,
      productsService as never,
      {} as never,
    );

    await job.run();

    expect(productsService.refreshPrice).toHaveBeenCalledTimes(4);
    expect(logged.at(-1)).toMatch(/4 revisados, 0 actualizados, 2 sin disponibilidad, 1 fallidos \(MLM1\), 1 omitidos/);
  });
});
