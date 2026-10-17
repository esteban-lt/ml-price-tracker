import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { HttpStatus } from '@nestjs/common';

import { PriceHistory } from '../../src/price-history/entities/price-history.entity.js';
import { Product } from '../../src/products/entities/product.entity.js';
import { createProduct, createSnapshot, createUser } from '../support/factories.js';
import { createTestApp, TestApp } from '../support/test-app.js';

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

describe('PriceHistoryController (e2e)', () => {
  let t: TestApp;
  let auth: { Authorization: string };
  let product: Product;

  const history = (productId: string, query = '') =>
    request(t.app.getHttpServer()).get(`/products/${productId}/price-history${query}`).set(auth);
  const prices = (body: PriceHistory[]) => body.map((snapshot) => snapshot.price);

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.close();
  });

  beforeEach(async () => {
    await t.reset();
    auth = { Authorization: `Bearer ${t.tokenFor(await createUser(t.dataSource))}` };
    product = await createProduct(t.dataSource);
  });

  it('por defecto devuelve los últimos 30 días en orden ascendente', async () => {
    await createSnapshot(t.dataSource, product, 900, daysAgo(2));
    await createSnapshot(t.dataSource, product, 1100, daysAgo(40));
    await createSnapshot(t.dataSource, product, 1000, daysAgo(10));

    const response = await history(product.id).expect(HttpStatus.OK);

    expect(prices(response.body)).toEqual([1000, 900]);
    expect(response.body[0]).toMatchObject({ currency: 'MXN', checkedAt: expect.any(String) });
  });

  it('acepta un rango de días válido', async () => {
    await createSnapshot(t.dataSource, product, 1100, daysAgo(40));
    await createSnapshot(t.dataSource, product, 900, daysAgo(2));

    const response = await history(product.id, '?days=60').expect(HttpStatus.OK);

    expect(prices(response.body)).toEqual([1100, 900]);
  });

  it.each(['0', '366', 'abc'])('rechaza days=%s', async (days) => {
    await history(product.id, `?days=${days}`).expect(HttpStatus.BAD_REQUEST);
  });

  it('devuelve un arreglo vacío si no hay historial', async () => {
    const response = await history(product.id).expect(HttpStatus.OK);
    expect(response.body).toEqual([]);
  });

  it('responde 404 si el producto no existe', async () => {
    await history(randomUUID()).expect(HttpStatus.NOT_FOUND);
  });

  it('responde 401 sin token', async () => {
    await request(t.app.getHttpServer()).get(`/products/${product.id}/price-history`).expect(HttpStatus.UNAUTHORIZED);
  });
});
