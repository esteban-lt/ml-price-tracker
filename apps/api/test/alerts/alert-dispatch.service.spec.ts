import { AlertDispatchService } from '../../src/alerts/alert-dispatch.service.js';

describe('AlertDispatchService (corridas solapadas)', () => {
  it('omite una segunda ejecución mientras la primera sigue en curso', async () => {
    let finishFirstQuery!: () => void;
    const execute = vi.fn(() => new Promise((resolve) => (finishFirstQuery = () => resolve({ affected: 0 }))));
    const builder = { update: () => builder, set: () => builder, where: () => builder, andWhere: () => builder, execute };
    const alertRepository = { createQueryBuilder: () => builder, find: vi.fn(async () => []) };
    const dispatcher = new AlertDispatchService(alertRepository as never, {} as never, {} as never, {
      getOrThrow: () => 'https://app.example.test',
    } as never);

    const first = dispatcher.run();
    await dispatcher.run();
    expect(execute).toHaveBeenCalledTimes(1);

    execute.mockResolvedValue({ affected: 0 });
    finishFirstQuery();
    await first;
    expect(alertRepository.find).toHaveBeenCalledTimes(1);
  });
});
