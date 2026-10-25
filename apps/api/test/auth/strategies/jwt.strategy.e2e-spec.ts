import { createHash, randomUUID } from 'node:crypto';
import request from 'supertest';
import { HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { Session } from '../../../src/auth/entities/session.entity.js';
import { createUser } from '../../support/factories.js';
import { createTestApp, TestApp } from '../../support/test-app.js';

const PASSWORD = 'Str0ng-Passw0rd!';
const EMAIL = 'guard@example.test';
const COOKIE_NAME = 'refresh_token';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

function refreshTokenOf(response: request.Response): string {
  const cookies = response.headers['set-cookie'] as unknown as string[];
  return cookies.find((cookie) => cookie.startsWith(`${COOKIE_NAME}=`))!.split(';')[0].slice(COOKIE_NAME.length + 1);
}

// El guard JWT exige firma, iss, aud y una sesión vigente en la familia del sid.
describe('JwtStrategy (e2e): access token ligado a la sesión', () => {
  let t: TestApp;
  let jwt: JwtService;
  const http = () => request(t.app.getHttpServer());
  const me = (token: string) => http().get('/auth/me').set('Authorization', `Bearer ${token}`);
  const refresh = (token: string) => http().post('/auth/refresh').set('Cookie', `${COOKIE_NAME}=${token}`);

  const login = async () => {
    const response = await http().post('/auth/login').send({ email: EMAIL, password: PASSWORD }).expect(HttpStatus.CREATED);
    return { accessToken: response.body.token as string, refreshToken: refreshTokenOf(response) };
  };

  beforeAll(async () => {
    t = await createTestApp();
    jwt = t.app.get(JwtService);
  });

  afterAll(async () => {
    await t.close();
  });

  beforeEach(async () => {
    await t.reset();
    await http().post('/auth/register').send({ name: 'Ana', email: EMAIL, password: PASSWORD }).expect(HttpStatus.CREATED);
    await vi.waitFor(() => expect(t.mail.lastCodeFor(EMAIL)).toBeDefined());
  });

  it('GET /auth/me devuelve el perfil aunque el token ya no lleve nombre ni correo', async () => {
    const { accessToken } = await login();

    const { body } = await me(accessToken).expect(HttpStatus.OK);

    expect(body).toMatchObject({ name: 'Ana', email: EMAIL, emailVerified: false });
  });

  it('logout invalida de inmediato el access token de esa sesión, no el de otras', async () => {
    const current = await login();
    const other = await login();

    await http().post('/auth/logout').set('Cookie', `${COOKIE_NAME}=${current.refreshToken}`).expect(HttpStatus.NO_CONTENT);

    await me(current.accessToken).expect(HttpStatus.UNAUTHORIZED);
    await me(other.accessToken).expect(HttpStatus.OK);
  });

  it('logout-all invalida de inmediato los access tokens de todas las sesiones', async () => {
    const a = await login();
    const b = await login();

    await http().post('/auth/logout-all').set('Authorization', `Bearer ${a.accessToken}`).expect(HttpStatus.NO_CONTENT);

    await me(a.accessToken).expect(HttpStatus.UNAUTHORIZED);
    await me(b.accessToken).expect(HttpStatus.UNAUTHORIZED);
  });

  it('rotar el refresh mantiene válido el access token anterior; reusar uno rotado los invalida todos', async () => {
    const { accessToken, refreshToken } = await login();
    const rotated = await refresh(refreshToken).expect(HttpStatus.OK);
    await me(accessToken).expect(HttpStatus.OK);

    await t.dataSource
      .getRepository(Session)
      .update({ tokenHash: sha256(refreshToken) }, { revokedAt: new Date(Date.now() - 60_000) });
    await refresh(refreshToken).expect(HttpStatus.UNAUTHORIZED);

    await me(accessToken).expect(HttpStatus.UNAUTHORIZED);
    await me(rotated.body.token).expect(HttpStatus.UNAUTHORIZED);
  });

  it('rechaza el token si la sesión vigente de la familia ya expiró', async () => {
    const { accessToken, refreshToken } = await login();

    await t.dataSource
      .getRepository(Session)
      .update({ tokenHash: sha256(refreshToken) }, { expiresAt: new Date(Date.now() - 1000) });

    await me(accessToken).expect(HttpStatus.UNAUTHORIZED);
  });

  it('rechaza un sid que pertenece a otro usuario', async () => {
    const { accessToken } = await login();
    const { sid } = jwt.decode<{ sid: string }>(accessToken);
    const intruder = await createUser(t.dataSource);

    await me(jwt.sign({ sub: intruder.id, sid })).expect(HttpStatus.UNAUTHORIZED);
  });

  it.each([
    ['otro iss', { issuer: 'otra-api' }],
    ['otra aud', { audience: 'otra-app' }],
  ])('rechaza un token con %s', async (_case, options) => {
    const { accessToken } = await login();
    const { sub, sid } = jwt.decode<{ sub: string; sid: string }>(accessToken);

    await me(jwt.sign({ sub, sid }, options)).expect(HttpStatus.UNAUTHORIZED);
  });

  it('rechaza tokens con el formato anterior o un sid inexistente', async () => {
    const user = await createUser(t.dataSource);

    await me(jwt.sign({ id: user.id, name: user.name, email: user.email })).expect(HttpStatus.UNAUTHORIZED);
    await me(jwt.sign({ sub: user.id, sid: 'no-es-uuid' })).expect(HttpStatus.UNAUTHORIZED);
    await me(jwt.sign({ sub: user.id, sid: randomUUID() })).expect(HttpStatus.UNAUTHORIZED);
  });

  it('la validación de la familia usa el índice parcial de sesiones activas', async () => {
    const { accessToken } = await login();
    const { sid } = jwt.decode<{ sid: string }>(accessToken);

    const plan = await t.dataSource.transaction(async (manager) => {
      await manager.query('SET LOCAL enable_seqscan = off');
      const rows: { 'QUERY PLAN': string }[] = await manager.query(
        `EXPLAIN SELECT 1 FROM sessions WHERE family_id = $1 AND revoked_at IS NULL AND expires_at > now()`,
        [sid],
      );
      return rows.map((row) => row['QUERY PLAN']).join('\n');
    });

    expect(plan).toContain('IDX_sessions_active_family');
  });
});
