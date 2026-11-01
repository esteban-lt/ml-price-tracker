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

describe('AlertDispatchService (reintento único)', () => {
  const summary = (retrying: number) => ({ sent: 0, skipped: 0, failed: 0, retrying });
  const stubDispatch = (dispatcher: AlertDispatchService, retrying: number) =>
    vi
      .spyOn(dispatcher as unknown as { dispatchPending: () => Promise<unknown> }, 'dispatchPending')
      .mockResolvedValue(summary(retrying));
  const createDispatcher = () =>
    new AlertDispatchService({} as never, {} as never, {} as never, { getOrThrow: () => 'https://app.example.test' } as never);

  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('si quedan correos pendientes reintenta una sola vez 10 minutos después', async () => {
    const dispatcher = createDispatcher();
    const dispatchPending = stubDispatch(dispatcher, 1);

    await dispatcher.run();
    await vi.advanceTimersByTimeAsync(9 * 60 * 1000);
    expect(dispatchPending).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(60 * 1000);
    expect(dispatchPending).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(dispatchPending).toHaveBeenCalledTimes(2);
  });

  it('sin pendientes no programa nada', async () => {
    const dispatcher = createDispatcher();
    const dispatchPending = stubDispatch(dispatcher, 0);

    await dispatcher.run();
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);

    expect(dispatchPending).toHaveBeenCalledTimes(1);
  });

  it('al cerrar la app cancela el reintento programado', async () => {
    const dispatcher = createDispatcher();
    const dispatchPending = stubDispatch(dispatcher, 1);

    await dispatcher.run();
    dispatcher.onModuleDestroy();
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);

    expect(dispatchPending).toHaveBeenCalledTimes(1);
  });
});
