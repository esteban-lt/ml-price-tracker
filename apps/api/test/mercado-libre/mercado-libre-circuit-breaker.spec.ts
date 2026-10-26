import {
  MercadoLibreCircuitBreaker,
  MercadoLibreUnavailableException,
} from '../../src/mercado-libre/mercado-libre-circuit-breaker.js';

describe('MercadoLibreCircuitBreaker', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const failTimes = (breaker: MercadoLibreCircuitBreaker, times: number) => {
    for (let i = 0; i < times; i++) breaker.recordFailure();
  };

  it('se abre tras 5 fallos seguidos y se vuelve a cerrar a los 30 segundos', () => {
    const breaker = new MercadoLibreCircuitBreaker();

    failTimes(breaker, 4);
    expect(() => breaker.assertClosed()).not.toThrow();
    breaker.recordFailure();
    expect(() => breaker.assertClosed()).toThrow(MercadoLibreUnavailableException);

    vi.advanceTimersByTime(30_000);
    expect(() => breaker.assertClosed()).not.toThrow();
  });

  it('un éxito reinicia la cuenta de fallos', () => {
    const breaker = new MercadoLibreCircuitBreaker();

    failTimes(breaker, 4);
    breaker.recordSuccess();
    failTimes(breaker, 4);

    expect(() => breaker.assertClosed()).not.toThrow();
  });

  it('si la primera petición tras la pausa falla, se vuelve a abrir de inmediato', () => {
    const breaker = new MercadoLibreCircuitBreaker();
    failTimes(breaker, 5);
    vi.advanceTimersByTime(30_000);

    breaker.recordFailure();

    expect(() => breaker.assertClosed()).toThrow(MercadoLibreUnavailableException);
  });
});
