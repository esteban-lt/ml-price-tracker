import { describeMercadoLibreError } from '../../src/mercado-libre/mercado-libre-error.js';
import { retryDelayMs } from '../../src/mercado-libre/mercado-libre-retry-policy.js';

describe('Política de reintentos de Mercado Libre', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([
    ['sin respuesta (red o timeout)', undefined, true],
    ['500', 500, true],
    ['503', 503, true],
    ['429', 429, true],
    ['400', 400, false],
    ['401', 401, false],
    ['404', 404, false],
  ])('%s → reintenta: %s', (_case, status, retries) => {
    expect(retryDelayMs({ status, message: 'error' }, 0) !== null).toBe(retries);
  });

  it('el backoff crece exponencialmente con jitter y nunca pasa del tope', () => {
    vi.spyOn(Math, 'random').mockReturnValue(1);

    expect(retryDelayMs({ status: 503, message: 'error' }, 0)).toBe(300);
    expect(retryDelayMs({ status: 503, message: 'error' }, 1)).toBe(600);
    expect(retryDelayMs({ status: 503, message: 'error' }, 2)).toBeNull();
  });

  it('usa Retry-After en segundos o como fecha', () => {
    const inSeconds = describeMercadoLibreError({ response: { status: 429, headers: { 'retry-after': '2' } } });
    const asDate = describeMercadoLibreError({
      response: { status: 429, headers: { 'retry-after': new Date(Date.now() + 3000).toUTCString() } },
    });

    expect(retryDelayMs(inSeconds, 0)).toBe(2000);
    expect(retryDelayMs(asDate, 0)).toBeGreaterThan(1000);
    expect(retryDelayMs(asDate, 0)).toBeLessThanOrEqual(3000);
  });

  it('no reintenta si Retry-After pide esperar más de 5 segundos', () => {
    const detail = describeMercadoLibreError({ response: { status: 429, headers: { 'retry-after': '60' } } });

    expect(retryDelayMs(detail, 0)).toBeNull();
  });
});
