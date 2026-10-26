import request from 'supertest';
import { HttpStatus } from '@nestjs/common';

import { createUser } from '../../support/factories.js';
import { TEST_ADMIN_EMAIL } from '../../support/setup-env.js';
import { createTestApp, TestApp } from '../../support/test-app.js';

// ADMIN_EMAILS en los tests es TEST_ADMIN_EMAIL (ver setup-env.ts). El caso de ADMIN_EMAILS
// vacía está en admin.guard.spec.ts.
describe('AdminGuard (e2e) en los endpoints de autorización de Mercado Libre', () => {
  let t: TestApp;
  const status = (token: string) =>
    request(t.app.getHttpServer()).get('/mercado-libre/auth/status').set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.close();
  });

  beforeEach(async () => {
    await t.reset();
  });

  it('un usuario que no es administrador recibe 403', async () => {
    const user = await createUser(t.dataSource, { verified: true });
    await status(await t.tokenFor(user)).expect(HttpStatus.FORBIDDEN);
  });

  it('un administrador sin correo verificado no pasa la autenticación', async () => {
    const admin = await createUser(t.dataSource, { email: TEST_ADMIN_EMAIL, verified: false });
    await status(await t.tokenFor(admin)).expect(HttpStatus.UNAUTHORIZED);
  });

  it('un administrador verificado puede consultar el estado', async () => {
    const admin = await createUser(t.dataSource, { email: TEST_ADMIN_EMAIL, verified: true });
    const response = await status(await t.tokenFor(admin)).expect(HttpStatus.OK);
    expect(response.body).toMatchObject({ authorized: false });
  });

  it('las búsquedas públicas siguen sin requerir sesión', async () => {
    await request(t.app.getHttpServer()).get('/mercado-libre/categories').expect(HttpStatus.OK);
  });
});
