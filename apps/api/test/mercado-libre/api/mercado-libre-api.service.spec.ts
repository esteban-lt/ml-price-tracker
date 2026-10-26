import { Observable, of, throwError } from 'rxjs';
import { BadGatewayException, NotFoundException } from '@nestjs/common';

import {
  MercadoLibreCircuitBreaker,
  MercadoLibreUnavailableException,
} from '../../../src/mercado-libre/mercado-libre-circuit-breaker.js';

import { MercadoLibreApiService } from '../../../src/mercado-libre/api/mercado-libre-api.service.js';

// Respuestas simuladas con la forma de los tipos internos del servicio (CatalogProduct, ProductItem,
// ProductSearch y Highlights). Una ruta sin respuesta registrada responde 404, como Mercado Libre.
type Route = unknown | { httpError: number; headers?: Record<string, string> } | ((token: string) => unknown);

const item = (price: number, id = `I${price}`) => ({
  item_id: id,
  price,
  original_price: null,
  currency_id: 'MXN',
  shipping: { free_shipping: true },
});
const catalogProduct = (id: string, overrides: object = {}) => ({
  id,
  name: `Producto ${id}`,
  status: 'active',
  pictures: [{ url: `https://http2.mlstatic.com/${id}.jpg` }],
  buy_box_winner: null,
  ...overrides,
});

function setup(routes: Record<string, Route>) {
  let tokenVersion = 1;
  const requested: { path: string; token: string }[] = [];
  const http = {
    get: vi.fn((url: string, config: { headers: { Authorization: string } }): Observable<unknown> => {
      const path = url.replace('https://api.mercadolibre.com', '');
      const token = config.headers.Authorization.replace('Bearer ', '');
      requested.push({ path, token });

      const route = routes[path.split('?')[0]];
      const value = typeof route === 'function' ? (route as (token: string) => unknown)(token) : route;
      if (value === undefined || (value as { httpError?: number }).httpError) {
        const status = (value as { httpError?: number } | undefined)?.httpError ?? 404;
        const headers = (value as { headers?: Record<string, string> } | undefined)?.headers ?? {};
        return throwError(() => ({ message: `status ${status}`, response: { status, headers, data: { message: 'error' } } }));
      }
      return value instanceof Observable ? value : of({ data: value });
    }),
  };
  const auth = {
    getValidToken: vi.fn(async () => `token-${tokenVersion}`),
    invalidateAccessToken: vi.fn(() => void tokenVersion++),
  };
  const service = new MercadoLibreApiService(http as never, auth as never, new MercadoLibreCircuitBreaker());
  return { service, requested, auth };
}

const search = (results: object[], total = results.length) => ({ paging: { total }, results });

describe('MercadoLibreApiService (HTTP simulado)', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('reintentos y cortacircuito', () => {
    const callsTo = (requested: { path: string }[], path: string) => requested.filter((request) => request.path === path).length;
    const flaky = (failures: number, status: number, headers?: Record<string, string>) => {
      let calls = 0;
      return () => (++calls <= failures ? { httpError: status, headers } : catalogProduct('MLM1'));
    };

    it.each([500, 503, 429])('reintenta una lectura que responde %s y termina bien', async (status) => {
      const { service, requested } = setup({
        '/products/MLM1': flaky(2, status),
        '/products/MLM1/items': { results: [item(100)] },
      });

      expect((await service.getProduct('MLM1')).price).toBe(100);
      expect(callsTo(requested, '/products/MLM1')).toBe(3);
    });

    it('hace como máximo 2 reintentos', async () => {
      const { service, requested } = setup({ '/products/MLM1': { httpError: 500 } });

      await expect(service.getProduct('MLM1')).rejects.toThrow(BadGatewayException);
      expect(callsTo(requested, '/products/MLM1')).toBe(3);
    });

    it.each([400, 403, 404])('no reintenta un %s', async (status) => {
      const { service, requested } = setup({ '/products/MLM1': { httpError: status } });

      await service.getProduct('MLM1').catch(() => undefined);
      expect(callsTo(requested, '/products/MLM1')).toBe(1);
    });

    it('respeta Retry-After y no reintenta si pide esperar más del tope', async () => {
      const shortWait = setup({ '/products/MLM1': flaky(1, 429, { 'retry-after': '0' }), '/products/MLM1/items': { results: [item(1)] } });
      await shortWait.service.getProduct('MLM1');
      expect(callsTo(shortWait.requested, '/products/MLM1')).toBe(2);

      const longWait = setup({ '/products/MLM1': flaky(1, 429, { 'retry-after': '120' }) });
      await longWait.service.getProduct('MLM1').catch(() => undefined);
      expect(callsTo(longWait.requested, '/products/MLM1')).toBe(1);
    });

    it('tras 5 fallos seguidos deja de llamar a Mercado Libre y responde 503', async () => {
      const { service, requested } = setup({ '/products/MLM1': { httpError: 503 } });
      for (let i = 0; i < 5; i++) await service.getProduct('MLM1').catch(() => undefined);
      const callsBefore = requested.length;

      await expect(service.getProduct('MLM1')).rejects.toThrow(MercadoLibreUnavailableException);
      expect(requested.length).toBe(callsBefore);
    });
  });

  describe('búsqueda', () => {
    it('solo devuelve productos de catálogo activos con ofertas, con el precio mínimo', async () => {
      const { service } = setup({
        '/products/search': search([
          catalogProduct('MLM1'),
          catalogProduct('MLM2', { status: 'inactive' }),
          catalogProduct('MLM3'),
          catalogProduct('MLM4'),
        ]),
        '/products/MLM1/items': { results: [item(1200), item(999.9), item(1500)] },
        '/products/MLM3/items': { results: [] },
        // MLM4 sin ruta de items: Mercado Libre responde 404 y el producto se descarta.
      });

      const result = await service.searchProducts('audífonos', 1);

      expect(result.products).toHaveLength(1);
      expect(result.products[0]).toMatchObject({
        id: 'MLM1',
        price: 999.9,
        itemId: 'I999.9',
        sellersCount: 3,
        position: 1,
        url: 'https://www.mercadolibre.com.mx/p/MLM1',
      });
    });

    it('un producto cuyas ofertas fallan se descarta sin romper la respuesta', async () => {
      const { service } = setup({
        '/products/search': search([catalogProduct('MLM1'), catalogProduct('MLM2')]),
        '/products/MLM1/items': { httpError: 500 },
        '/products/MLM2/items': { results: [item(500)] },
      });

      const result = await service.searchProducts('tv', 1);

      expect(result.products.map((product) => product.id)).toEqual(['MLM2']);
      expect(result.products[0].position).toBe(2);
    });

    it.each([
      [1, 120, 50, true],
      [2, 120, 50, true],
      [3, 500, 50, false],
      [1, 30, 30, false],
    ])('página %s con %s resultados totales (%s en la página) → hasMore=%s', async (page, total, count, hasMore) => {
      const results = Array.from({ length: count }, (_, i) => catalogProduct(`MLM${i}`, { status: 'inactive' }));
      const { service } = setup({ '/products/search': search(results, total) });

      expect((await service.searchProducts('celular', page)).hasMore).toBe(hasMore);
    });
  });

  describe('fallback a buy_box_winner', () => {
    it.each([403, 410])('usa buy_box_winner si /items responde %s', async (status) => {
      const { service } = setup({
        '/products/MLM1': catalogProduct('MLM1', { buy_box_winner: item(777, 'BUYBOX') }),
        '/products/MLM1/items': { httpError: status },
      });

      expect(await service.getProduct('MLM1')).toMatchObject({ price: 777, itemId: 'BUYBOX', sellersCount: 1 });
    });

    it('sin buy_box_winner el producto se considera sin ofertas (404)', async () => {
      const { service } = setup({
        '/products/MLM1': catalogProduct('MLM1'),
        '/products/MLM1/items': { httpError: 403 },
      });

      await expect(service.getProduct('MLM1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('token', () => {
    it('ante un 401 renueva el token y reintenta una sola vez', async () => {
      const { service, auth, requested } = setup({
        '/products/MLM1': (token: string) => (token === 'token-1' ? { httpError: 401 } : catalogProduct('MLM1')),
        '/products/MLM1/items': { results: [item(100)] },
      });

      expect((await service.getProduct('MLM1')).price).toBe(100);
      expect(auth.invalidateAccessToken).toHaveBeenCalledTimes(1);
      expect(requested.filter(({ path }) => path === '/products/MLM1').map(({ token }) => token)).toEqual([
        'token-1',
        'token-2',
      ]);
    });

    it('si el 401 se repite no vuelve a reintentar y responde un 502 genérico', async () => {
      const { service, auth } = setup({ '/products/MLM1': { httpError: 401 } });

      await expect(service.getProduct('MLM1')).rejects.toThrow(BadGatewayException);
      expect(auth.invalidateAccessToken).toHaveBeenCalledTimes(1);
    });
  });

  it('las categorías solo incluyen destacados de tipo PRODUCT y limita las peticiones en paralelo', async () => {
    const content = Array.from({ length: 30 }, (_, i) => ({ id: `MLM${i}`, position: i + 1, type: 'PRODUCT' }));
    content.push({ id: 'ITEM1', position: 31, type: 'ITEM' as never });
    let inFlight = 0;
    let maxInFlight = 0;
    const slowProduct = (id: string) => () =>
      new Observable((subscriber) => {
        maxInFlight = Math.max(maxInFlight, ++inFlight);
        setTimeout(() => {
          inFlight--;
          subscriber.next({ data: catalogProduct(id) });
          subscriber.complete();
        }, 5);
      });
    const routes: Record<string, Route> = { '/highlights/MLM/category/MLM1648': { content } };
    for (const { id } of content) {
      routes[`/products/${id}`] = slowProduct(id);
      routes[`/products/${id}/items`] = { results: [item(100)] };
    }
    const { service, requested } = setup(routes);

    const products = await service.getProductsByCategory('MLM1648');

    expect(products).toHaveLength(30);
    expect(requested.some(({ path }) => path.startsWith('/products/ITEM1'))).toBe(false);
    expect(maxInFlight).toBeGreaterThan(1);
    expect(maxInFlight).toBeLessThanOrEqual(10);
  });
});
