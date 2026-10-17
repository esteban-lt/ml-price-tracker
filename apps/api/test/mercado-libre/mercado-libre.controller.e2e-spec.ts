import request from 'supertest';
import { HttpStatus } from '@nestjs/common';

import { MERCADO_LIBRE_CATEGORIES } from '../../src/mercado-libre/api/mercado-libre-categories.js';
import { createTestApp, TestApp } from '../support/test-app.js';

// Endpoints públicos del catálogo. Solo se prueba la validación y las categorías: la búsqueda
// en sí está cubierta por mercado-libre-api.service.spec.ts con HTTP simulado.
describe('MercadoLibreController (e2e): catálogo público', () => {
  let t: TestApp;
  const http = () => request(t.app.getHttpServer());

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.close();
  });

  it('lista las categorías con slug y nombre, sin el id interno de Mercado Libre', async () => {
    const response = await http().get('/mercado-libre/categories').expect(HttpStatus.OK);

    expect(response.body).toHaveLength(MERCADO_LIBRE_CATEGORIES.length);
    expect(response.body[0]).toEqual({ slug: expect.any(String), name: expect.any(String) });
  });

  it('una categoría inexistente responde 404', async () => {
    await http().get('/mercado-libre/products/no-existe').expect(HttpStatus.NOT_FOUND);
  });

  it.each([
    ['sin texto', ''],
    ['texto de 1 carácter', '?q=a'],
    ['texto de más de 100 caracteres', `?q=${'a'.repeat(101)}`],
    ['página 0', '?q=tv&page=0'],
    ['página mayor al máximo', '?q=tv&page=4'],
  ])('la búsqueda responde 400 %s', async (_case, query) => {
    await http().get(`/mercado-libre/products${query}`).expect(HttpStatus.BAD_REQUEST);
  });
});
