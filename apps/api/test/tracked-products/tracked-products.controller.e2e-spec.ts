import request from 'supertest';
import { HttpStatus } from '@nestjs/common';

import { Alert } from '../../src/alerts/entities/alert.entity.js';
import { Product } from '../../src/products/entities/product.entity.js';
import {
  TrackedProduct,
  TrackingStatusEnum,
} from '../../src/tracked-products/entities/tracked-product.entity.js';
import { User } from '../../src/users/entities/user.entity.js';
import { createAlert, createProduct, createSnapshot, createTracking, createUser } from '../support/factories.js';
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
    token = await t.tokenFor(await createUser(t.dataSource));
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

  describe('con un seguimiento existente', () => {
    let tracking: TrackedProduct;
    const http = () => request(t.app.getHttpServer());
    const auth = () => ({ Authorization: `Bearer ${token}` });
    const reload = () => t.dataSource.getRepository(TrackedProduct).findOneByOrFail({ id: tracking.id });

    beforeEach(async () => {
      const [owner] = await t.dataSource.getRepository(User).find();
      tracking = await createTracking(t.dataSource, { user: owner, product: await createProduct(t.dataSource) });
    });

    it('pausa y reanuda', async () => {
      const paused = await http().patch(`/tracked-products/${tracking.id}/pause`).set(auth()).expect(HttpStatus.OK);
      expect(paused.body.status).toBe(TrackingStatusEnum.PAUSED);

      const resumed = await http().patch(`/tracked-products/${tracking.id}/resume`).set(auth()).expect(HttpStatus.OK);
      expect(resumed.body.status).toBe(TrackingStatusEnum.ACTIVE);
    });

    it('edita el umbral validando según el tipo', async () => {
      const edit = (body: object) => http().patch(`/tracked-products/${tracking.id}`).set(auth()).send(body);

      await edit({ thresholdType: 'percentage_drop', thresholdValue: 20 }).expect(HttpStatus.OK);
      expect(await reload()).toMatchObject({ thresholdType: 'percentage_drop', thresholdValue: 20 });

      await edit({ thresholdType: 'percentage_drop', thresholdValue: 150 }).expect(HttpStatus.BAD_REQUEST);
      await edit({ thresholdType: 'price_below', thresholdValue: 0 }).expect(HttpStatus.BAD_REQUEST);
      await edit({ thresholdType: 'price_below', thresholdValue: 150 }).expect(HttpStatus.OK);
      expect(await reload()).toMatchObject({ thresholdType: 'price_below', thresholdValue: 150 });
    });

    it('eliminar borra el seguimiento y sus alertas', async () => {
      const product = await t.dataSource.getRepository(Product).findOneByOrFail({ id: tracking.productId });
      const snapshot = await createSnapshot(t.dataSource, product, 800);
      await createAlert(t.dataSource, { tracking, snapshot });

      await http().delete(`/tracked-products/${tracking.id}`).set(auth()).expect(HttpStatus.NO_CONTENT);

      expect(await t.dataSource.getRepository(TrackedProduct).countBy({ id: tracking.id })).toBe(0);
      expect(await t.dataSource.getRepository(Alert).countBy({ trackedProductId: tracking.id })).toBe(0);
    });

    it('el listado solo incluye los seguimientos propios', async () => {
      const other = await createUser(t.dataSource);
      await createTracking(t.dataSource, { user: other, product: await createProduct(t.dataSource) });

      const response = await http().get('/tracked-products').set(auth()).expect(HttpStatus.OK);

      expect(response.body.map((item: TrackedProduct) => item.id)).toEqual([tracking.id]);
    });

    it('no permite ver, modificar ni borrar el seguimiento de otro usuario (404)', async () => {
      const other = await createUser(t.dataSource);
      const foreign = await createTracking(t.dataSource, { user: other, product: await createProduct(t.dataSource) });
      const path = `/tracked-products/${foreign.id}`;

      await http().get(path).set(auth()).expect(HttpStatus.NOT_FOUND);
      await http()
        .patch(path)
        .set(auth())
        .send({ thresholdType: 'price_below', thresholdValue: 1 })
        .expect(HttpStatus.NOT_FOUND);
      await http().patch(`${path}/pause`).set(auth()).expect(HttpStatus.NOT_FOUND);
      await http().delete(path).set(auth()).expect(HttpStatus.NOT_FOUND);

      expect(await t.dataSource.getRepository(TrackedProduct).findOneByOrFail({ id: foreign.id })).toMatchObject({
        thresholdValue: foreign.thresholdValue,
        status: TrackingStatusEnum.ACTIVE,
      });
    });
  });
});
