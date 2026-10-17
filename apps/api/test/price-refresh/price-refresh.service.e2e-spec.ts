import { PriceHistory } from '../../src/price-history/entities/price-history.entity.js';
import { PriceRefreshService } from '../../src/price-refresh/price-refresh.service.js';
import { Product } from '../../src/products/entities/product.entity.js';
import { createProduct, createSnapshot, createTracking, createUser, minutesAgo } from '../support/factories.js';
import { createTestApp, TestApp } from '../support/test-app.js';

// El job solo revisa productos con un seguimiento activo y sin snapshot en los últimos 30 minutos.
describe('PriceRefreshService (e2e): job de precios', () => {
  let t: TestApp;
  let job: PriceRefreshService;

  const givenTrackedProduct = async (externalId: string, { isAvailable = true } = {}) => {
    const product = await createProduct(t.dataSource, { externalId, isAvailable });
    await createSnapshot(t.dataSource, product, 1000, minutesAgo(120));
    await createTracking(t.dataSource, { user: await createUser(t.dataSource), product, createdAt: minutesAgo(180) });
    return product;
  };
  const snapshotsOf = (product: Product) =>
    t.dataSource.getRepository(PriceHistory).find({ where: { productId: product.id }, order: { checkedAt: 'ASC' } });
  const reload = (product: Product) => t.dataSource.getRepository(Product).findOneByOrFail({ id: product.id });

  beforeAll(async () => {
    t = await createTestApp();
    job = t.app.get(PriceRefreshService);
  });

  afterAll(async () => {
    await t.close();
  });

  beforeEach(async () => {
    await t.reset();
  });

  it('guarda un snapshot nuevo con el precio actual', async () => {
    const product = await givenTrackedProduct('MLM20000001');
    t.mercadoLibre.setProduct('MLM20000001', { price: 950 });

    await job.run();

    expect((await snapshotsOf(product)).map((snapshot) => snapshot.price)).toEqual([1000, 950]);
  });

  it('un producto sin vendedores pasa a no disponible y no crea snapshot', async () => {
    const product = await givenTrackedProduct('MLM20000001');
    t.mercadoLibre.setProduct('MLM20000001', 'no-sellers');

    await job.run();

    expect((await reload(product)).isAvailable).toBe(false);
    expect(await snapshotsOf(product)).toHaveLength(1);
  });

  it('si vuelve a tener precio se marca disponible y guarda snapshot', async () => {
    const product = await givenTrackedProduct('MLM20000001', { isAvailable: false });
    t.mercadoLibre.setProduct('MLM20000001', { price: 990 });

    await job.run();

    expect((await reload(product)).isAvailable).toBe(true);
    expect(await snapshotsOf(product)).toHaveLength(2);
  });

  it.each(['error', 'rate-limited'] as const)('un error transitorio (%s) no lo marca como no disponible', async (behavior) => {
    const product = await givenTrackedProduct('MLM20000001');
    t.mercadoLibre.setProduct('MLM20000001', behavior);

    await job.run();

    expect((await reload(product)).isAvailable).toBe(true);
    expect(await snapshotsOf(product)).toHaveLength(1);
  });

  it('el fallo de un producto no detiene la revisión de los demás', async () => {
    const failing = await givenTrackedProduct('MLM20000001');
    const healthy = await givenTrackedProduct('MLM20000002');
    t.mercadoLibre.setProduct('MLM20000001', 'error');
    t.mercadoLibre.setProduct('MLM20000002', { price: 800 });

    await job.run();

    expect(await snapshotsOf(failing)).toHaveLength(1);
    expect((await snapshotsOf(healthy)).map((snapshot) => snapshot.price)).toEqual([1000, 800]);
  });

  it('crea la alerta cuando el precio nuevo cruza el umbral', async () => {
    await givenTrackedProduct('MLM20000001');
    t.mercadoLibre.setProduct('MLM20000001', { price: 850 });

    await job.run();

    expect(await t.dataSource.query('SELECT count(*)::int AS n FROM alerts')).toEqual([{ n: 1 }]);
  });
});
