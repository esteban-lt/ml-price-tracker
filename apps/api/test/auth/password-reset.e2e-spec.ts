import request from 'supertest';
import { HttpStatus } from '@nestjs/common';

import { PasswordResetToken } from '../../src/auth/entities/password-reset-token.entity.js';
import { User } from '../../src/users/entities/user.entity.js';
import { registerVerifiedUser, TEST_PASSWORD } from '../support/auth-flow.js';
import { TEST_FRONTEND_ORIGIN } from '../support/setup-env.js';
import { createTestApp, TestApp } from '../support/test-app.js';

const EMAIL = 'reset@example.test';
const NEW_PASSWORD = 'An0ther-Str0ng-Passw0rd!';

describe('Recuperar contraseña (e2e)', () => {
  let t: TestApp;
  const http = () => request(t.app.getHttpServer());
  const forgotPassword = (email: string) => http().post('/auth/forgot-password').send({ email });
  const resetPassword = (token: string, password = NEW_PASSWORD) =>
    http().post('/auth/reset-password').send({ token, password });
  const login = (password: string) => http().post('/auth/login').send({ email: EMAIL, password });
  const resetTokenFor = async (email: string) => {
    await vi.waitFor(() => expect(t.mail.lastPasswordResetTokenFor(email)).toBeDefined());
    return t.mail.lastPasswordResetTokenFor(email)!;
  };

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.close();
  });

  beforeEach(async () => {
    await t.reset();
  });

  it('responde 204 sin enviar nada si el correo no existe', async () => {
    await forgotPassword('nadie@example.test').expect(HttpStatus.NO_CONTENT);

    expect(t.mail.sent).toHaveLength(0);
  });

  it('envía un enlace al frontend y solo guarda el hash del token', async () => {
    await registerVerifiedUser(t, { email: EMAIL });

    await forgotPassword(' RESET@example.test ').expect(HttpStatus.NO_CONTENT);
    const token = await resetTokenFor(EMAIL);

    expect(t.mail.sentTo(EMAIL).at(-1)!.text).toContain(`${TEST_FRONTEND_ORIGIN}/reset-password?token=${token}`);
    const [stored] = await t.dataSource.getRepository(PasswordResetToken).find();
    expect(stored.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.tokenHash).not.toContain(token);
  });

  it('restablece la contraseña una sola vez y cierra todas las sesiones', async () => {
    const { body: session } = await registerVerifiedUser(t, { email: EMAIL });
    await forgotPassword(EMAIL).expect(HttpStatus.NO_CONTENT);
    const token = await resetTokenFor(EMAIL);

    await resetPassword(token).expect(HttpStatus.NO_CONTENT);

    await http().get('/auth/me').set('Authorization', `Bearer ${session.token}`).expect(HttpStatus.UNAUTHORIZED);
    await login(TEST_PASSWORD).expect(HttpStatus.UNAUTHORIZED);
    await login(NEW_PASSWORD).expect(HttpStatus.CREATED);
    await resetPassword(token, 'Otra-Passw0rd-Segura!').expect(HttpStatus.BAD_REQUEST);
  });

  it('rechaza un token vencido o inventado y una contraseña débil', async () => {
    await registerVerifiedUser(t, { email: EMAIL });
    await forgotPassword(EMAIL).expect(HttpStatus.NO_CONTENT);
    const token = await resetTokenFor(EMAIL);

    await resetPassword(token, 'debil').expect(HttpStatus.BAD_REQUEST);
    await resetPassword('token-inventado').expect(HttpStatus.BAD_REQUEST);
    await t.dataSource.query(`UPDATE password_reset_tokens SET expires_at = now() - interval '1 minute'`);
    await resetPassword(token).expect(HttpStatus.BAD_REQUEST);
    await login(TEST_PASSWORD).expect(HttpStatus.CREATED);
  });

  it('no envía otro enlace antes de un minuto; después el nuevo reemplaza al anterior', async () => {
    await registerVerifiedUser(t, { email: EMAIL });
    await forgotPassword(EMAIL).expect(HttpStatus.NO_CONTENT);
    const first = await resetTokenFor(EMAIL);

    await forgotPassword(EMAIL).expect(HttpStatus.NO_CONTENT);
    expect(t.mail.sentTo(EMAIL).filter((message) => message.text.includes('reset-password'))).toHaveLength(1);

    await t.dataSource.query(`UPDATE password_reset_tokens SET created_at = now() - interval '2 minutes'`);
    await forgotPassword(EMAIL).expect(HttpStatus.NO_CONTENT);
    await vi.waitFor(() => expect(t.mail.lastPasswordResetTokenFor(EMAIL)).not.toBe(first));

    await resetPassword(first).expect(HttpStatus.BAD_REQUEST);
    await resetPassword(t.mail.lastPasswordResetTokenFor(EMAIL)!).expect(HttpStatus.NO_CONTENT);
  });

  it('restablecer la contraseña de una cuenta sin verificar también verifica el correo', async () => {
    await http().post('/auth/register').send({ name: 'Ana', email: EMAIL, password: TEST_PASSWORD });
    await vi.waitFor(() => expect(t.mail.lastCodeFor(EMAIL)).toBeDefined());
    await forgotPassword(EMAIL).expect(HttpStatus.NO_CONTENT);

    await resetPassword(await resetTokenFor(EMAIL)).expect(HttpStatus.NO_CONTENT);

    expect((await t.dataSource.getRepository(User).findOneByOrFail({ email: EMAIL })).emailVerifiedAt).not.toBeNull();
    await login(NEW_PASSWORD).expect(HttpStatus.CREATED);
  });
});
