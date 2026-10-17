import request from 'supertest';
import { HttpStatus, Logger } from '@nestjs/common';

import { EmailVerificationCode } from '../../src/auth/entities/email-verification-code.entity.js';
import { User } from '../../src/users/entities/user.entity.js';
import { createTestApp, TestApp } from '../support/test-app.js';

const PASSWORD = 'Str0ng-Passw0rd!';

describe('AuthController (e2e): registro y verificación de correo', () => {
  let t: TestApp;
  const http = () => request(t.app.getHttpServer());

  const register = async (email: string) => {
    const { body } = await http()
      .post('/auth/register')
      .send({ name: 'Ana', email, password: PASSWORD })
      .expect(HttpStatus.CREATED);
    return { token: body.token as string, user: body.user };
  };
  const codeFor = async (email: string) => {
    await vi.waitFor(() => expect(t.mail.lastCodeFor(email)).toBeDefined());
    return t.mail.lastCodeFor(email)!;
  };
  const verify = (token: string, code: string) =>
    http().post('/auth/verify-email').set('Authorization', `Bearer ${token}`).send({ code });
  const attemptsOf = async (userId: string) =>
    (await t.dataSource.getRepository(EmailVerificationCode).findOneByOrFail({ userId })).attempts;
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

  it('permite iniciar sesión escribiendo el correo con otras mayúsculas', async () => {
    await register('login@example.test');
    await http()
      .post('/auth/login')
      .send({ email: ' LOGIN@example.test', password: PASSWORD })
      .expect(HttpStatus.CREATED);
  });

  it('verifica con el código correcto y es idempotente', async () => {
    const { token, user } = await register('ok@example.test');
    const code = await codeFor('ok@example.test');

    const first = await verify(token, code).expect(HttpStatus.OK);
    expect(first.body.emailVerified).toBe(true);
    expect(await t.dataSource.getRepository(EmailVerificationCode).countBy({ userId: user.id })).toBe(0);

    const second = await verify(token, code).expect(HttpStatus.OK);
    expect(second.body.emailVerified).toBe(true);
    await http()
      .post('/auth/resend-verification')
      .set('Authorization', `Bearer ${token}`)
      .expect(HttpStatus.NO_CONTENT);
    expect(t.mail.sentTo('ok@example.test')).toHaveLength(1);
  });

  it('un código incorrecto indica los intentos restantes', async () => {
    const { token } = await register('wrong@example.test');
    const code = await codeFor('wrong@example.test');

    const response = await verify(token, wrongCode(code)).expect(HttpStatus.BAD_REQUEST);
    expect(response.body.message).toMatch(/4 intentos/);
  });

  it('peticiones incorrectas en paralelo no superan los 5 intentos', async () => {
    const { token, user } = await register('parallel@example.test');
    const code = await codeFor('parallel@example.test');

    await Promise.all(Array.from({ length: 8 }, () => verify(token, wrongCode(code))));

    expect(await attemptsOf(user.id)).toBe(5);
    const response = await verify(token, code).expect(HttpStatus.BAD_REQUEST);
    expect(response.body.message).toMatch(/máximo de intentos/);
  });

  it('rechaza un código vencido', async () => {
    const { token, user } = await register('expired@example.test');
    const code = await codeFor('expired@example.test');
    await t.dataSource.query(
      `UPDATE email_verification_codes SET expires_at = now() - interval '1 minute' WHERE user_id = $1`,
      [user.id],
    );

    const response = await verify(token, code).expect(HttpStatus.BAD_REQUEST);
    expect(response.body.message).toMatch(/venció/);
  });

  it('no permite reenviar antes de 60 segundos, pero sí después', async () => {
    const { token, user } = await register('resend@example.test');
    await codeFor('resend@example.test');
    const resend = () => http().post('/auth/resend-verification').set('Authorization', `Bearer ${token}`);

    await resend().expect(HttpStatus.TOO_MANY_REQUESTS);

    // Simula que el código se creó hace más de un minuto (vence 10 minutos después de crearse).
    await t.dataSource.query(
      `UPDATE email_verification_codes SET expires_at = now() + interval '8 minutes' WHERE user_id = $1`,
      [user.id],
    );
    await resend().expect(HttpStatus.NO_CONTENT);
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
