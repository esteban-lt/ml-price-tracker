import request from 'supertest';
import { HttpStatus, Logger } from '@nestjs/common';

import { EmailVerificationCode } from '../../src/auth/entities/email-verification-code.entity.js';
import { Session } from '../../src/auth/entities/session.entity.js';
import { User } from '../../src/users/entities/user.entity.js';
import { TEST_PASSWORD as PASSWORD, waitForVerificationCode } from '../support/auth-flow.js';
import { createUser } from '../support/factories.js';
import { createTestApp, TestApp } from '../support/test-app.js';

describe('AuthController (e2e): registro y verificación de correo obligatoria', () => {
  let t: TestApp;
  const http = () => request(t.app.getHttpServer());

  const register = async (email: string) => {
    const response = await http()
      .post('/auth/register')
      .send({ name: 'Ana', email, password: PASSWORD })
      .expect(HttpStatus.CREATED);
    return { response, verificationToken: response.body.verificationToken as string, user: response.body.user };
  };
  const login = (email: string, password = PASSWORD) => http().post('/auth/login').send({ email, password });
  const codeFor = (email: string) => waitForVerificationCode(t, email);
  const verify = (verificationToken: string, code: string) =>
    http().post('/auth/verify-email').set('Authorization', `Bearer ${verificationToken}`).send({ code });
  const resend = (verificationToken: string) =>
    http().post('/auth/resend-verification').set('Authorization', `Bearer ${verificationToken}`);
  const attemptsOf = async (userId: string) =>
    (await t.dataSource.getRepository(EmailVerificationCode).findOneByOrFail({ userId })).attempts;
  const sessionsOf = (userId: string) => t.dataSource.getRepository(Session).countBy({ userId });
  const wrongCode = (code: string) => (code === '000000' ? '111111' : '000000');

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.close();
    vi.restoreAllMocks();
  });

  beforeEach(async () => {
    await t.reset();
  });

  it('registra con el correo normalizado y envía el código sin imprimirlo en los logs', async () => {
    const logged: unknown[] = [];
    for (const method of ['log', 'warn', 'error', 'debug', 'verbose'] as const) {
      vi.spyOn(Logger.prototype, method).mockImplementation((...args: unknown[]) => void logged.push(...args));
    }

    const { user } = await register('  Ana.Perez@Example.TEST ');
    const code = await codeFor('ana.perez@example.test');

    expect(user).toMatchObject({ email: 'ana.perez@example.test', emailVerified: false });
    expect(code).toMatch(/^\d{6}$/);
    expect(JSON.stringify(logged)).not.toContain(code);
    vi.restoreAllMocks();
  });

  it('el registro no abre sesión: solo entrega un token de verificación que no da acceso a la app', async () => {
    const { response, verificationToken, user } = await register('pending@example.test');

    expect(response.body.token).toBeUndefined();
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(await sessionsOf(user.id)).toBe(0);
    for (const path of ['/auth/me', '/tracked-products', '/alerts']) {
      await http().get(path).set('Authorization', `Bearer ${verificationToken}`).expect(HttpStatus.UNAUTHORIZED);
    }
  });

  it('verificar el código abre la sesión y el token de verificación deja de servir', async () => {
    const { verificationToken, user } = await register('ok@example.test');
    const code = await codeFor('ok@example.test');

    const response = await verify(verificationToken, code).expect(HttpStatus.OK);

    expect(response.body.user.emailVerified).toBe(true);
    expect(response.headers['set-cookie']?.[0]).toMatch(/^refresh_token=/);
    expect(await sessionsOf(user.id)).toBe(1);
    expect(await t.dataSource.getRepository(EmailVerificationCode).countBy({ userId: user.id })).toBe(0);
    await http().get('/auth/me').set('Authorization', `Bearer ${response.body.token}`).expect(HttpStatus.OK);
    await verify(verificationToken, code).expect(HttpStatus.UNAUTHORIZED);
    await resend(verificationToken).expect(HttpStatus.UNAUTHORIZED);
  });

  it('el login de una cuenta sin verificar responde 403 con un token de verificación y sin sesión', async () => {
    const { user } = await register('unverified@example.test');
    const code = await codeFor('unverified@example.test');

    const response = await login('unverified@example.test').expect(HttpStatus.FORBIDDEN);

    expect(response.body).toMatchObject({ code: 'EMAIL_NOT_VERIFIED', verificationToken: expect.any(String) });
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(await sessionsOf(user.id)).toBe(0);
    await verify(response.body.verificationToken, code).expect(HttpStatus.OK);
  });

  it('el login con contraseña incorrecta de una cuenta sin verificar responde 401 sin token', async () => {
    await register('wrong-password@example.test');

    const response = await login('wrong-password@example.test', 'otra-contraseña').expect(HttpStatus.UNAUTHORIZED);

    expect(response.body.verificationToken).toBeUndefined();
  });

  it('después de verificar permite iniciar sesión escribiendo el correo con otras mayúsculas', async () => {
    const { verificationToken } = await register('login@example.test');
    await verify(verificationToken, await codeFor('login@example.test')).expect(HttpStatus.OK);

    await login(' LOGIN@example.test').expect(HttpStatus.CREATED);
  });

  it('un access token no sirve como token de verificación', async () => {
    const user = await createUser(t.dataSource, { email: 'access@example.test', verified: false });

    await resend(await t.tokenFor(user)).expect(HttpStatus.UNAUTHORIZED);
  });

  it('un código incorrecto indica los intentos restantes', async () => {
    const { verificationToken } = await register('wrong@example.test');
    const code = await codeFor('wrong@example.test');

    const response = await verify(verificationToken, wrongCode(code)).expect(HttpStatus.BAD_REQUEST);
    expect(response.body.message).toMatch(/4 intentos/);
  });

  it('peticiones incorrectas en paralelo no superan los 5 intentos', async () => {
    const { verificationToken, user } = await register('parallel@example.test');
    const code = await codeFor('parallel@example.test');

    await Promise.all(Array.from({ length: 8 }, () => verify(verificationToken, wrongCode(code))));

    expect(await attemptsOf(user.id)).toBe(5);
    const response = await verify(verificationToken, code).expect(HttpStatus.BAD_REQUEST);
    expect(response.body.message).toMatch(/máximo de intentos/);
  });

  it('rechaza un código vencido', async () => {
    const { verificationToken, user } = await register('expired@example.test');
    const code = await codeFor('expired@example.test');
    await t.dataSource.query(
      `UPDATE email_verification_codes SET expires_at = now() - interval '1 minute' WHERE user_id = $1`,
      [user.id],
    );

    const response = await verify(verificationToken, code).expect(HttpStatus.BAD_REQUEST);
    expect(response.body.message).toMatch(/venció/);
  });

  it('no permite reenviar antes de 60 segundos, pero sí después', async () => {
    const { verificationToken, user } = await register('resend@example.test');
    await codeFor('resend@example.test');

    await resend(verificationToken).expect(HttpStatus.TOO_MANY_REQUESTS);

    await t.dataSource.query(
      `UPDATE email_verification_codes SET expires_at = now() + interval '8 minutes' WHERE user_id = $1`,
      [user.id],
    );
    await resend(verificationToken).expect(HttpStatus.NO_CONTENT);
    expect(t.mail.sentTo('resend@example.test')).toHaveLength(2);
  });

  it('responde 401 sin token', async () => {
    await http().post('/auth/verify-email').send({ code: '123456' }).expect(HttpStatus.UNAUTHORIZED);
    await http().post('/auth/resend-verification').expect(HttpStatus.UNAUTHORIZED);
  });

  it('un fallo al enviar el correo no rompe el registro', async () => {
    t.mail.failWith(() => new Error('Resend caído'));

    await register('mail-down@example.test');

    expect(await t.dataSource.getRepository(User).countBy({ email: 'mail-down@example.test' })).toBe(1);
  });
});

describe('AuthController (e2e): límite de peticiones', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp({ throttle: true });
    await t.reset();
  });

  afterAll(async () => {
    await t.close();
  });

  it('el login responde 429 después de 5 intentos por minuto', async () => {
    const login = () =>
      request(t.app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nobody@example.test', password: PASSWORD });

    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await login()).status);

    expect(statuses.slice(0, 5)).toEqual(Array(5).fill(HttpStatus.UNAUTHORIZED));
    expect(statuses[5]).toBe(HttpStatus.TOO_MANY_REQUESTS);
  });
});
