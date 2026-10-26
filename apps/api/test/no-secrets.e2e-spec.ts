import request from 'supertest';
import { HttpStatus } from '@nestjs/common';

import { EmailVerificationCode } from '../src/auth/entities/email-verification-code.entity.js';
import { MercadoLibreToken } from '../src/mercado-libre/auth/entities/mercado-libre-token.entity.js';
import { User } from '../src/users/entities/user.entity.js';
import { waitForVerificationCode } from './support/auth-flow.js';
import { createAlert, createProduct, createSnapshot, createTracking } from './support/factories.js';
import { TEST_ADMIN_EMAIL } from './support/setup-env.js';
import { createTestApp, TestApp } from './support/test-app.js';

const PASSWORD = 'Str0ng-Passw0rd!';
const ML_REFRESH_TOKEN = 'TG-secret-refresh-token-for-tests';
const FORBIDDEN_KEYS = /"(password|codeHash|code_hash|refreshToken|refresh_token|access_token|accessToken)"/i;

// Recorre las respuestas que consume el frontend y comprueba que ninguna expone secretos.
describe('Respuestas sin secretos (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
    await t.reset();
  });

  afterAll(async () => {
    await t.close();
  });

  it('registro, login sin verificar, verificación, login, refresh, perfil, seguimientos, alertas, productos y estado de Mercado Libre', async () => {
    const http = () => request(t.app.getHttpServer());
    const bodies: unknown[] = [];
    const collect = (response: request.Response) => {
      bodies.push(response.body);
      return response;
    };

    await t.dataSource.getRepository(MercadoLibreToken).save({ id: 1, refreshToken: ML_REFRESH_TOKEN });
    const { body: registration } = collect(
      await http().post('/auth/register').send({ name: 'Admin', email: TEST_ADMIN_EMAIL, password: PASSWORD }),
    );
    collect(await http().post('/auth/login').send({ email: TEST_ADMIN_EMAIL, password: PASSWORD }).expect(HttpStatus.FORBIDDEN));
    const code = await waitForVerificationCode(t, TEST_ADMIN_EMAIL);
    const user = await t.dataSource.getRepository(User).findOneByOrFail({ email: TEST_ADMIN_EMAIL });
    const { codeHash } = await t.dataSource.getRepository(EmailVerificationCode).findOneByOrFail({ userId: user.id });
    collect(
      await http()
        .post('/auth/verify-email')
        .set('Authorization', `Bearer ${registration.verificationToken}`)
        .send({ code })
        .expect(HttpStatus.OK),
    );
    const { body: login } = collect(
      await http().post('/auth/login').send({ email: TEST_ADMIN_EMAIL, password: PASSWORD }).expect(HttpStatus.CREATED),
    );
    const auth = { Authorization: `Bearer ${login.token}` };
    const loginResponse = collect(await http().post('/auth/login').send({ email: TEST_ADMIN_EMAIL, password: PASSWORD }));
    const refreshCookie = (loginResponse.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
    const refreshToken = refreshCookie.split('=')[1];
    collect(await http().post('/auth/refresh').set('Cookie', refreshCookie).expect(HttpStatus.OK));

    const product = await createProduct(t.dataSource);
    const tracking = await createTracking(t.dataSource, { user, product });
    await createAlert(t.dataSource, { tracking, snapshot: await createSnapshot(t.dataSource, product, 800) });

    for (const path of [
      '/auth/me',
      '/tracked-products',
      `/tracked-products/${tracking.id}`,
      '/alerts',
      '/products',
      `/products/${product.id}`,
    ]) {
      collect(await http().get(path).set(auth).expect(HttpStatus.OK));
    }
    collect(await http().get('/mercado-libre/auth/status').set(auth).expect(HttpStatus.OK));

    const serialized = JSON.stringify(bodies);
    expect(bodies.length).toBeGreaterThanOrEqual(10);
    expect(serialized).not.toMatch(FORBIDDEN_KEYS);
    for (const secret of [PASSWORD, user.password, codeHash, ML_REFRESH_TOKEN, refreshToken]) {
      expect(serialized).not.toContain(secret);
    }
  });
});
