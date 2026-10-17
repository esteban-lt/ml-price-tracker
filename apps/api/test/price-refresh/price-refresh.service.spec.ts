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
