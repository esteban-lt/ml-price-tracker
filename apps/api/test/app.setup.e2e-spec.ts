import request from 'supertest';
import { HttpStatus } from '@nestjs/common';

import { createUser } from './support/factories.js';
import { TEST_FRONTEND_ORIGIN } from './support/setup-env.js';
import { createTestApp, TestApp } from './support/test-app.js';

// La app de pruebas usa la misma setupApp que main.ts (CORS, helmet, trust proxy y validación).
describe('setupApp (e2e): configuración de arranque', () => {
  let t: TestApp;
  const http = () => request(t.app.getHttpServer());

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.close();
  });

  describe('CORS', () => {
    const preflight = (origin: string) =>
      http()
        .options('/auth/login')
        .set('Origin', origin)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'authorization,content-type');

    it('un origen permitido recibe los headers de CORS', async () => {
      const response = await preflight(TEST_FRONTEND_ORIGIN);

      expect(response.headers['access-control-allow-origin']).toBe(TEST_FRONTEND_ORIGIN);
      expect(response.headers['access-control-allow-headers']).toMatch(/authorization/i);
      expect(response.headers['access-control-allow-methods']).toMatch(/PATCH/);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('un origen no permitido no recibe headers de CORS', async () => {
      const response = await preflight('https://evil.example.test');

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  it('incluye los headers de seguridad de helmet', async () => {
    const response = await http().get('/health').expect(HttpStatus.OK);

    expect(response.headers).toMatchObject({
      'x-content-type-options': 'nosniff',
      'x-frame-options': expect.any(String),
      'strict-transport-security': expect.any(String),
      'content-security-policy': expect.any(String),
    });
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  describe('validación de cuerpos', () => {
    let auth: { Authorization: string };

    beforeEach(async () => {
      await t.reset();
      auth = { Authorization: `Bearer ${await t.tokenFor(await createUser(t.dataSource))}` };
    });

    it('rechaza campos no permitidos', async () => {
      await http()
        .post('/tracked-products')
        .set(auth)
        .send({ store: 'mercado_libre', externalId: 'MLM12345678', thresholdType: 'price_below', thresholdValue: 900, isAdmin: true })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('rechaza JSON mal formado', async () => {
      await http()
        .post('/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"email": ')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('rechaza tipos incorrectos en lugar de convertirlos', async () => {
      await http()
        .patch('/users/me/email-notifications')
        .set(auth)
        .send({ enabled: 'false' })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });
});

describe('setupApp (e2e): límite de peticiones detrás del proxy', () => {
  let t: TestApp;
  const login = (ip: string) =>
    request(t.app.getHttpServer())
      .post('/auth/login')
      .set('X-Forwarded-For', ip)
      .send({ email: 'nobody@example.test', password: 'Str0ng-Passw0rd!' });

  beforeAll(async () => {
    t = await createTestApp({ throttle: true });
    await t.reset();
  });

  afterAll(async () => {
    await t.close();
  });

  it('dos IPs reales distintas (X-Forwarded-For) no comparten el límite del login', async () => {
    for (let i = 0; i < 5; i++) await login('203.0.113.10');

    expect((await login('203.0.113.10')).status).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect((await login('203.0.113.20')).status).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('GET /health no cuenta contra el límite ni consulta la base de datos', async () => {
    const createQueryRunner = vi.spyOn(t.dataSource, 'createQueryRunner');

    for (let i = 0; i < 110; i++) {
      await request(t.app.getHttpServer()).get('/health').set('X-Forwarded-For', '203.0.113.30').expect(HttpStatus.OK);
    }

    expect(createQueryRunner).not.toHaveBeenCalled();

    // Control: una ruta que sí usa la base pasa por el mismo espía.
    await login('203.0.113.40');
    expect(createQueryRunner).toHaveBeenCalled();
    createQueryRunner.mockRestore();
  });
});
