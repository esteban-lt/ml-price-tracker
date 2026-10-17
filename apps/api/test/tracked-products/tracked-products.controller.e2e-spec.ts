import request from 'supertest';
import { HttpStatus } from '@nestjs/common';

import { createProduct, createTracking, createUser } from '../support/factories.js';
import { createTestApp, TestApp } from '../support/test-app.js';

describe('TrackedProductsController (e2e)', () => {
  let t: TestApp;
  let token: string;

  const track = (body: object, as = token) =>
    request(t.app.getHttpServer()).post('/tracked-products').set('Authorization', `Bearer ${as}`).send(body);

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.close();
  });

  beforeEach(async () => {
    await t.reset();
    token = t.tokenFor(await createUser(t.dataSource));
  });

  it('guarda el precio actual como precio de referencia', async () => {
    t.mercadoLibre.setProduct('MLM10000001', { price: 1499.9 });

    const response = await track({
      store: 'mercado_libre',
      externalId: 'MLM10000001',
      thresholdType: 'price_below',
      thresholdValue: 1200,
    }).expect(HttpStatus.CREATED);

    expect(response.body).toMatchObject({ referencePrice: 1499.9, thresholdValue: 1200, status: 'active' });
  });

  it('responde 409 si el usuario ya sigue el producto', async () => {
    const body = { store: 'mercado_libre', externalId: 'MLM10000001', thresholdType: 'price_below', thresholdValue: 900 };

    await track(body).expect(HttpStatus.CREATED);
    await track(body).expect(HttpStatus.CONFLICT);
  });

  it('responde 400 con un umbral inválido', async () => {
    await track({
      store: 'mercado_libre',
      externalId: 'MLM10000001',
      thresholdType: 'percentage_drop',
      thresholdValue: 150,
    }).expect(HttpStatus.BAD_REQUEST);
  });

  it('el seguimiento de otro usuario responde 404', async () => {
    const other = await createUser(t.dataSource);
    const tracking = await createTracking(t.dataSource, { user: other, product: await createProduct(t.dataSource) });
    const auth = { Authorization: `Bearer ${token}` };

    await request(t.app.getHttpServer()).get(`/tracked-products/${tracking.id}`).set(auth).expect(HttpStatus.NOT_FOUND);
    await request(t.app.getHttpServer())
      .delete(`/tracked-products/${tracking.id}`)
      .set(auth)
      .expect(HttpStatus.NOT_FOUND);
  });
});
