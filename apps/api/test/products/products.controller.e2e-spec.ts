import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { HttpStatus } from '@nestjs/common';

import { PriceHistory } from '../../src/price-history/entities/price-history.entity.js';
import { Product } from '../../src/products/entities/product.entity.js';
import { createUser } from '../support/factories.js';
import { createTestApp, TestApp } from '../support/test-app.js';

describe('ProductsController (e2e)', () => {
  let t: TestApp;
  let auth: { Authorization: string };

  const addProduct = (body: object) =>
    request(t.app.getHttpServer()).post('/products').set(auth).send(body);

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.close();
  });

  beforeEach(async () => {
    await t.reset();
    const user = await createUser(t.dataSource);
    auth = { Authorization: `Bearer ${t.tokenFor(user)}` };
  });

  it('rechaza peticiones sin token', async () => {
    await request(t.app.getHttpServer()).get('/products').expect(HttpStatus.UNAUTHORIZED);
    await request(t.app.getHttpServer())
      .post('/products')
      .send({ store: 'mercado_libre', externalId: 'MLM12345678' })
      .expect(HttpStatus.UNAUTHORIZED);
  });

  describe('POST /products', () => {
    it('crea el producto y su primer snapshot de precio', async () => {
      t.mercadoLibre.setProduct('MLM12345678', { price: 1299.5 });

      const response = await addProduct({ store: 'mercado_libre', externalId: 'MLM12345678' }).expect(
        HttpStatus.CREATED,
      );

      expect(response.body).toMatchObject({ store: 'mercado_libre', externalId: 'MLM12345678', isAvailable: true });
      const snapshots = await t.dataSource.getRepository(PriceHistory).findBy({ productId: response.body.id });
      expect(snapshots.map((snapshot) => snapshot.price)).toEqual([1299.5]);
    });

    it('devuelve el mismo producto si se agrega dos veces, sin otro snapshot', async () => {
      const body = { store: 'mercado_libre', externalId: 'MLM12345678' };

      const first = await addProduct(body).expect(HttpStatus.CREATED);
      const second = await addProduct(body).expect(HttpStatus.CREATED);

      expect(second.body.id).toBe(first.body.id);
      expect(await t.dataSource.getRepository(Product).count()).toBe(1);
      expect(await t.dataSource.getRepository(PriceHistory).count()).toBe(1);
    });

    it.each([
      ['sin externalId', { store: 'mercado_libre' }],
      ['externalId con formato inválido', { store: 'mercado_libre', externalId: 'abc123' }],
      ['tienda inválida', { store: 'ebay', externalId: 'MLM12345678' }],
      ['campos no permitidos', { store: 'mercado_libre', externalId: 'MLM12345678', price: 10 }],
    ])('responde 400 con %s', async (_case, body) => {
      await addProduct(body).expect(HttpStatus.BAD_REQUEST);
      expect(t.mercadoLibre.calls).toHaveLength(0);
    });

    it('responde 501 para Amazon', async () => {
      await addProduct({ store: 'amazon', externalId: 'B0ABC12345' }).expect(HttpStatus.NOT_IMPLEMENTED);
    });

    it('responde 404 si el producto no tiene vendedores en Mercado Libre', async () => {
      t.mercadoLibre.setProduct('MLM12345678', 'no-sellers');

      await addProduct({ store: 'mercado_libre', externalId: 'MLM12345678' }).expect(HttpStatus.NOT_FOUND);
      expect(await t.dataSource.getRepository(Product).count()).toBe(0);
    });

    it('responde 502 si Mercado Libre falla', async () => {
      t.mercadoLibre.setProduct('MLM12345678', 'error');

      await addProduct({ store: 'mercado_libre', externalId: 'MLM12345678' }).expect(HttpStatus.BAD_GATEWAY);
    });
  });

  describe('GET /products', () => {
    it('lista los productos agregados', async () => {
      await addProduct({ store: 'mercado_libre', externalId: 'MLM11111111' });
      await addProduct({ store: 'mercado_libre', externalId: 'MLM22222222' });

      const response = await request(t.app.getHttpServer()).get('/products').set(auth).expect(HttpStatus.OK);

      expect(response.body.map((product: Product) => product.externalId)).toEqual(
        expect.arrayContaining(['MLM11111111', 'MLM22222222']),
      );
    });
  });

  describe('GET /products/:id', () => {
    it('devuelve el producto por id', async () => {
      const { body: added } = await addProduct({ store: 'mercado_libre', externalId: 'MLM12345678' });

      const response = await request(t.app.getHttpServer())
        .get(`/products/${added.id}`)
        .set(auth)
        .expect(HttpStatus.OK);

      expect(response.body).toMatchObject({ id: added.id, externalId: 'MLM12345678' });
    });

    it('responde 404 si el producto no existe', async () => {
      await request(t.app.getHttpServer()).get(`/products/${randomUUID()}`).set(auth).expect(HttpStatus.NOT_FOUND);
    });

    it('responde 400 si el id no es un UUID', async () => {
      await request(t.app.getHttpServer()).get('/products/abc').set(auth).expect(HttpStatus.BAD_REQUEST);
    });
  });
});
