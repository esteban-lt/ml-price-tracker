import { AlertDetectionService } from '../../src/alerts/alert-detection.service.js';
import { Alert } from '../../src/alerts/entities/alert.entity.js';
import { Product } from '../../src/products/entities/product.entity.js';
import {
  ThresholdTypeEnum,
  TrackingStatusEnum,
} from '../../src/tracked-products/entities/tracked-product.entity.js';
import { createProduct, createSnapshot, createTracking, createUser, minutesAgo } from '../support/factories.js';
import { createTestApp, TestApp } from '../support/test-app.js';

// Cada snapshot se crea un "minuto" después del anterior, a partir de la creación del seguimiento.
describe('AlertDetectionService (e2e): detección de cruces', () => {
  let t: TestApp;
  let detection: AlertDetectionService;
  let product: Product;
  let minute: number;

  const nextPrice = async (price: number) => {
    const snapshot = await createSnapshot(t.dataSource, product, price, minutesAgo(minute--));
    return { snapshot, created: await detection.detectForSnapshot(snapshot) };
  };
  const alertCount = () => t.dataSource.getRepository(Alert).count();
  const track = async (overrides: Partial<Parameters<typeof createTracking>[1]> = {}) =>
    createTracking(t.dataSource, {
      user: await createUser(t.dataSource),
      product,
      createdAt: minutesAgo(100),
      ...overrides,
    });

  beforeAll(async () => {
    t = await createTestApp();
    detection = t.app.get(AlertDetectionService);
  });

  afterAll(async () => {
    await t.close();
  });

  beforeEach(async () => {
    await t.reset();
    product = await createProduct(t.dataSource);
    minute = 90;
  });

  it('crea una sola alerta al cruzar, sin duplicar ni repetir mientras sigue bajo el umbral', async () => {
    await track({ thresholdValue: 900, referencePrice: 1000 });

    expect((await nextPrice(950)).created).toBe(0);
    const crossing = await nextPrice(899);
    expect(crossing.created).toBe(1);
    expect(await detection.detectForSnapshot(crossing.snapshot)).toBe(0);
    expect((await nextPrice(850)).created).toBe(0);
    expect(await alertCount()).toBe(1);
  });

  it('subir y volver a bajar crea otra alerta', async () => {
    await track({ thresholdValue: 900, referencePrice: 1000 });

    await nextPrice(880);
    await nextPrice(1000);
    expect((await nextPrice(870)).created).toBe(1);
    expect(await alertCount()).toBe(2);
  });

  it('no alerta si el seguimiento ya cumplía la condición al empezar', async () => {
    await track({ thresholdValue: 1200, referencePrice: 1000 });

    expect((await nextPrice(990)).created).toBe(0);
    expect(await alertCount()).toBe(0);
  });

  it('percentage_drop alerta al bajar el porcentaje desde el precio de referencia', async () => {
    await track({ thresholdType: ThresholdTypeEnum.PERCENTAGE_DROP, thresholdValue: 10, referencePrice: 1000 });

    expect((await nextPrice(901)).created).toBe(0);
    expect((await nextPrice(900)).created).toBe(1);
  });

  it('un seguimiento pausado no genera alertas', async () => {
    await track({ thresholdValue: 900, status: TrackingStatusEnum.PAUSED });

    expect((await nextPrice(500)).created).toBe(0);
  });

  it('evalúa a cada usuario por separado', async () => {
    await track({ thresholdValue: 900, referencePrice: 1000 });
    await track({ thresholdValue: 700, referencePrice: 1000 });

    expect((await nextPrice(850)).created).toBe(1);
    expect((await nextPrice(650)).created).toBe(1);
  });
});
