import { createHash } from 'node:crypto';
import request from 'supertest';
import { IsNull } from 'typeorm';
import { HttpStatus } from '@nestjs/common';

import { Session } from '../../src/auth/entities/session.entity.js';
import { User } from '../../src/users/entities/user.entity.js';
import { createTestApp, TestApp } from '../support/test-app.js';

const PASSWORD = 'Str0ng-Passw0rd!';
const EMAIL = 'sesiones@example.test';
const COOKIE_NAME = 'refresh_token';
const DAY_MS = 24 * 60 * 60 * 1000;

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

// `refresh_token=<valor>; Path=/auth; ...` → el header completo y el valor.
function refreshCookieOf(response: request.Response): { header: string; value: string } {
  const cookies = (response.headers['set-cookie'] as unknown as string[] | undefined) ?? [];
  const header = cookies.find((cookie) => cookie.startsWith(`${COOKIE_NAME}=`));
  if (!header) throw new Error('La respuesta no trae la cookie del refresh token');
  return { header, value: header.split(';')[0].slice(COOKIE_NAME.length + 1) };
}

describe('Sesiones con refresh token (e2e)', () => {
  let t: TestApp;
  const http = () => request(t.app.getHttpServer());
  const sessions = () => t.dataSource.getRepository(Session);

  const login = (userAgent = 'vitest') =>
    http()
      .post('/auth/login')
      .set('User-Agent', userAgent)
      .send({ email: EMAIL, password: PASSWORD })
      .expect(HttpStatus.CREATED);
  const refresh = (token: string) => http().post('/auth/refresh').set('Cookie', `${COOKIE_NAME}=${token}`);
  const sessionOf = (token: string) => sessions().findOneByOrFail({ tokenHash: sha256(token) });

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.close();
  });

  beforeEach(async () => {
    await t.reset();
    await http().post('/auth/register').send({ name: 'Ana', email: EMAIL, password: PASSWORD }).expect(HttpStatus.CREATED);
    await vi.waitFor(() => expect(t.mail.lastCodeFor(EMAIL)).toBeDefined());
  });

  it('el registro también abre una sesión', async () => {
    const user = await t.dataSource.getRepository(User).findOneByOrFail({ email: EMAIL });
    expect(await sessions().countBy({ userId: user.id })).toBe(1);
  });

  it('login devuelve el access token en el cuerpo y el refresh en una cookie HttpOnly de 30 días', async () => {
    const response = await login('Mozilla/5.0 prueba');
    const { header, value } = refreshCookieOf(response);

    expect(response.body.token).toEqual(expect.any(String));
    expect(JSON.stringify(response.body)).not.toContain(value);
    expect(header).toMatch(/HttpOnly/i);
    expect(header).toMatch(/Path=\/auth/);
    expect(header).toMatch(/SameSite=Lax/i);
    const expires = new Date(header.match(/Expires=([^;]+)/)![1]).getTime();
    expect(expires - Date.now()).toBeGreaterThan(29 * DAY_MS);

    const session = await sessionOf(value);
    expect(session).toMatchObject({ userAgent: 'Mozilla/5.0 prueba', revokedAt: null, lastUsedAt: null });
    expect(session.ip).toEqual(expect.any(String));
    expect(session.expiresAt.getTime() - Date.now()).toBeGreaterThan(29 * DAY_MS);
  });

  it('el access token solo lleva sub, sid, iat, exp, iss y aud, y dura 15 minutos', async () => {
    const response = await login();
    const [, payload] = response.body.token.split('.');
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
    const user = await t.dataSource.getRepository(User).findOneByOrFail({ email: EMAIL });
    const session = await sessionOf(refreshCookieOf(response).value);

    expect(Object.keys(claims).sort()).toEqual(['aud', 'exp', 'iat', 'iss', 'sid', 'sub']);
    expect(claims).toMatchObject({ sub: user.id, sid: session.familyId, iss: 'nudge-api', aud: 'nudge-app' });
    expect(claims.exp - claims.iat).toBe(15 * 60);
  });

  it('refresh rota el token dentro de la misma familia y devuelve un access token válido', async () => {
    const first = refreshCookieOf(await login()).value;

    const response = await refresh(first).expect(HttpStatus.OK);
    const second = refreshCookieOf(response).value;

    expect(second).not.toBe(first);
    const [old, current] = await Promise.all([sessionOf(first), sessionOf(second)]);
    expect(old.revokedAt).not.toBeNull();
    expect(old.lastUsedAt).not.toBeNull();
    expect(current.revokedAt).toBeNull();
    expect(current.familyId).toBe(old.familyId);
    expect(response.body.user.email).toBe(EMAIL);
    await http().get('/auth/me').set('Authorization', `Bearer ${response.body.token}`).expect(HttpStatus.OK);
  });

  it('refresh sin cookie, con un token desconocido o con uno expirado responde 401', async () => {
    await http().post('/auth/refresh').expect(HttpStatus.UNAUTHORIZED);
    await refresh('token-inventado').expect(HttpStatus.UNAUTHORIZED);

    const token = refreshCookieOf(await login()).value;
    await sessions().update({ tokenHash: sha256(token) }, { expiresAt: new Date(Date.now() - 1000) });
    await refresh(token).expect(HttpStatus.UNAUTHORIZED);
  });

  it('reusar un token rotado hace tiempo revoca toda la familia', async () => {
    const first = refreshCookieOf(await login()).value;
    const second = refreshCookieOf(await refresh(first).expect(HttpStatus.OK)).value;
    await sessions().update({ tokenHash: sha256(first) }, { revokedAt: new Date(Date.now() - 60_000) });

    await refresh(first).expect(HttpStatus.UNAUTHORIZED);

    expect((await sessionOf(second)).revokedAt).not.toBeNull();
    await refresh(second).expect(HttpStatus.UNAUTHORIZED);
  });

  it('un refresh repetido justo después de rotar (dos pestañas) falla sin cerrar la sesión', async () => {
    const first = refreshCookieOf(await login()).value;
    const second = refreshCookieOf(await refresh(first).expect(HttpStatus.OK)).value;

    await refresh(first).expect(HttpStatus.UNAUTHORIZED);

    await refresh(second).expect(HttpStatus.OK);
  });

  it('dos refresh en paralelo con el mismo token: solo uno rota', async () => {
    const token = refreshCookieOf(await login()).value;

    const statuses = (await Promise.all([refresh(token), refresh(token)])).map((response) => response.status).sort();

    expect(statuses).toEqual([HttpStatus.OK, HttpStatus.UNAUTHORIZED]);
  });

  it('logout revoca solo la sesión actual y borra la cookie', async () => {
    const current = refreshCookieOf(await login('navegador A')).value;
    const other = refreshCookieOf(await login('navegador B')).value;

    const response = await http()
      .post('/auth/logout')
      .set('Cookie', `${COOKIE_NAME}=${current}`)
      .expect(HttpStatus.NO_CONTENT);

    expect(refreshCookieOf(response).header).toMatch(/Expires=Thu, 01 Jan 1970/);
    await refresh(current).expect(HttpStatus.UNAUTHORIZED);
    await refresh(other).expect(HttpStatus.OK);
  });

  it('logout sin cookie responde 204', async () => {
    await http().post('/auth/logout').expect(HttpStatus.NO_CONTENT);
  });

  it('logout-all exige access token y revoca todas las sesiones del usuario', async () => {
    const a = await login('navegador A');
    const b = refreshCookieOf(await login('navegador B')).value;

    await http().post('/auth/logout-all').expect(HttpStatus.UNAUTHORIZED);
    await http().post('/auth/logout-all').set('Authorization', `Bearer ${a.body.token}`).expect(HttpStatus.NO_CONTENT);

    const user = await t.dataSource.getRepository(User).findOneByOrFail({ email: EMAIL });
    expect(await sessions().countBy({ userId: user.id, revokedAt: IsNull() })).toBe(0);
    await refresh(refreshCookieOf(a).value).expect(HttpStatus.UNAUTHORIZED);
    await refresh(b).expect(HttpStatus.UNAUTHORIZED);
  });
});
