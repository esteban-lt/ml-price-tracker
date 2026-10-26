import request from 'supertest';
import { HttpStatus } from '@nestjs/common';

import { Session } from '../../src/auth/entities/session.entity.js';
import { TrackedProduct } from '../../src/tracked-products/entities/tracked-product.entity.js';
import { User } from '../../src/users/entities/user.entity.js';
import { registerVerifiedUser, TEST_PASSWORD, waitForVerificationCode } from '../support/auth-flow.js';
import { createProduct, createTracking } from '../support/factories.js';
import { createTestApp, TestApp } from '../support/test-app.js';

const NEW_PASSWORD = 'An0ther-Str0ng-Passw0rd!';

describe('Cuenta (e2e): registro repetido, cambio de contraseña y eliminación', () => {
  let t: TestApp;
  const http = () => request(t.app.getHttpServer());
  const users = () => t.dataSource.getRepository(User);
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  const register = (email: string, { name = 'Ana', password = TEST_PASSWORD } = {}) =>
    http().post('/auth/register').send({ name, email, password });
  const login = (email: string, password: string) => http().post('/auth/login').send({ email, password });
  const verify = (verificationToken: string, code: string) =>
    http().post('/auth/verify-email').set(bearer(verificationToken)).send({ code });
  const refreshCookieOf = (response: request.Response) =>
    (response.headers['set-cookie'] as unknown as string[]).find((cookie) => cookie.startsWith('refresh_token='))!;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.close();
  });

  beforeEach(async () => {
    await t.reset();
  });

  describe('registrarse con un correo que ya existe', () => {
    const EMAIL = 'taken@example.test';

    it('si la cuenta no está verificada, reemplaza nombre y contraseña y entrega un token nuevo', async () => {
      const first = await register(EMAIL, { name: 'Intruso', password: NEW_PASSWORD }).expect(HttpStatus.CREATED);
      const code = await waitForVerificationCode(t, EMAIL);

      const second = await register(EMAIL, { name: 'Ana' }).expect(HttpStatus.CREATED);

      expect(second.body.user).toMatchObject({ id: first.body.user.id, name: 'Ana', emailVerified: false });
      expect(await users().countBy({ email: EMAIL })).toBe(1);
      await login(EMAIL, NEW_PASSWORD).expect(HttpStatus.UNAUTHORIZED);
      await login(EMAIL, TEST_PASSWORD).expect(HttpStatus.FORBIDDEN);
      await verify(first.body.verificationToken, code).expect(HttpStatus.UNAUTHORIZED);
      await verify(second.body.verificationToken, code).expect(HttpStatus.OK);
    });

    it('respeta el cooldown del código: dentro del minuto no envía otro correo, después sí', async () => {
      const { body } = await register(EMAIL).expect(HttpStatus.CREATED);
      await waitForVerificationCode(t, EMAIL);

      await register(EMAIL).expect(HttpStatus.CREATED);
      expect(t.mail.sentTo(EMAIL)).toHaveLength(1);

      await t.dataSource.query(
        `UPDATE email_verification_codes SET expires_at = now() + interval '8 minutes' WHERE user_id = $1`,
        [body.user.id],
      );
      await register(EMAIL).expect(HttpStatus.CREATED);
      await vi.waitFor(() => expect(t.mail.sentTo(EMAIL)).toHaveLength(2));
    });

    it('si la cuenta ya está verificada, responde 400 sin tocarla', async () => {
      await registerVerifiedUser(t, { email: EMAIL });

      const response = await register(EMAIL, { name: 'Intruso', password: NEW_PASSWORD }).expect(HttpStatus.BAD_REQUEST);

      expect(response.body.verificationToken).toBeUndefined();
      expect(await users().findOneByOrFail({ email: EMAIL })).toMatchObject({ name: 'Ana' });
      await login(EMAIL, TEST_PASSWORD).expect(HttpStatus.CREATED);
    });
  });

  describe('POST /auth/change-password', () => {
    const EMAIL = 'change@example.test';
    const changePassword = (token: string, currentPassword: string, newPassword = NEW_PASSWORD) =>
      http().post('/auth/change-password').set(bearer(token)).send({ currentPassword, newPassword });

    it('cambia la contraseña, cierra las demás sesiones y devuelve una sesión nueva', async () => {
      const current = await registerVerifiedUser(t, { email: EMAIL });
      const other = await login(EMAIL, TEST_PASSWORD).expect(HttpStatus.CREATED);

      const response = await changePassword(current.body.token, TEST_PASSWORD).expect(HttpStatus.OK);

      await http().get('/auth/me').set(bearer(current.body.token)).expect(HttpStatus.UNAUTHORIZED);
      await http().get('/auth/me').set(bearer(other.body.token)).expect(HttpStatus.UNAUTHORIZED);
      await http().post('/auth/refresh').set('Cookie', refreshCookieOf(other)).expect(HttpStatus.UNAUTHORIZED);
      await http().get('/auth/me').set(bearer(response.body.token)).expect(HttpStatus.OK);
      await http().post('/auth/refresh').set('Cookie', refreshCookieOf(response)).expect(HttpStatus.OK);
      await login(EMAIL, TEST_PASSWORD).expect(HttpStatus.UNAUTHORIZED);
      await login(EMAIL, NEW_PASSWORD).expect(HttpStatus.CREATED);
    });

    it('con la contraseña actual incorrecta responde 403 y no cambia nada', async () => {
      const { body } = await registerVerifiedUser(t, { email: EMAIL });

      await changePassword(body.token, 'no-es-la-contraseña').expect(HttpStatus.FORBIDDEN);

      await http().get('/auth/me').set(bearer(body.token)).expect(HttpStatus.OK);
      await login(EMAIL, TEST_PASSWORD).expect(HttpStatus.CREATED);
    });

    it('exige una contraseña nueva segura y una sesión', async () => {
      const { body } = await registerVerifiedUser(t, { email: EMAIL });

      await changePassword(body.token, TEST_PASSWORD, 'debil').expect(HttpStatus.BAD_REQUEST);
      await http()
        .post('/auth/change-password')
        .send({ currentPassword: TEST_PASSWORD, newPassword: NEW_PASSWORD })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('DELETE /auth/me', () => {
    const EMAIL = 'delete@example.test';
    const deleteAccount = (token: string, password: string) =>
      http().delete('/auth/me').set(bearer(token)).send({ password });

    it('con la contraseña correcta borra la cuenta, sus datos y sus sesiones', async () => {
      const { body } = await registerVerifiedUser(t, { email: EMAIL });
      const user = await users().findOneByOrFail({ email: EMAIL });
      await createTracking(t.dataSource, { user, product: await createProduct(t.dataSource) });

      const response = await deleteAccount(body.token, TEST_PASSWORD).expect(HttpStatus.NO_CONTENT);

      expect(refreshCookieOf(response)).toMatch(/Expires=Thu, 01 Jan 1970/);
      expect(await users().countBy({ id: user.id })).toBe(0);
      expect(await t.dataSource.getRepository(TrackedProduct).countBy({ userId: user.id })).toBe(0);
      expect(await t.dataSource.getRepository(Session).countBy({ userId: user.id })).toBe(0);
      await http().get('/auth/me').set(bearer(body.token)).expect(HttpStatus.UNAUTHORIZED);
      await login(EMAIL, TEST_PASSWORD).expect(HttpStatus.UNAUTHORIZED);
    });

    it('con la contraseña incorrecta responde 403 y conserva la cuenta', async () => {
      const { body } = await registerVerifiedUser(t, { email: EMAIL });

      await deleteAccount(body.token, 'no-es-la-contraseña').expect(HttpStatus.FORBIDDEN);

      expect(await users().countBy({ email: EMAIL })).toBe(1);
    });
  });
});
