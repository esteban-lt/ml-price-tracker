import request from 'supertest';
import { HttpStatus } from '@nestjs/common';

import { EmailUnsubscribeTokenService } from '../../src/users/email-unsubscribe-token.service.js';
import { User } from '../../src/users/entities/user.entity.js';
import { createUser } from '../support/factories.js';
import { createTestApp, TestApp } from '../support/test-app.js';

describe('POST /users/unsubscribe (e2e)', () => {
  let t: TestApp;
  let tokens: EmailUnsubscribeTokenService;
  const unsubscribe = (token: string) => request(t.app.getHttpServer()).post(`/users/unsubscribe?token=${token}`);
  const notificationsOf = async (user: User) =>
    (await t.dataSource.getRepository(User).findOneByOrFail({ id: user.id })).emailNotifications;

  beforeAll(async () => {
    t = await createTestApp();
    tokens = t.app.get(EmailUnsubscribeTokenService);
  });

  afterAll(async () => {
    await t.close();
  });

  beforeEach(async () => {
    await t.reset();
  });

  it('con la petición de un clic del cliente de correo (RFC 8058) apaga las alertas por correo sin sesión', async () => {
    const user = await createUser(t.dataSource);

    await unsubscribe(tokens.create(user.id))
      .type('form')
      .send('List-Unsubscribe=One-Click')
      .expect(HttpStatus.NO_CONTENT);

    expect(await notificationsOf(user)).toBe(false);
  });

  it('es idempotente y también acepta la petición sin cuerpo que hace el frontend', async () => {
    const user = await createUser(t.dataSource);
    const token = tokens.create(user.id);

    await unsubscribe(token).expect(HttpStatus.NO_CONTENT);
    await unsubscribe(token).expect(HttpStatus.NO_CONTENT);

    expect(await notificationsOf(user)).toBe(false);
  });

  it('rechaza un token alterado o de otro usuario', async () => {
    const user = await createUser(t.dataSource);
    const other = await createUser(t.dataSource);
    const [, otherSignature] = tokens.create(other.id).split('.');

    await unsubscribe(`${user.id}.${otherSignature}`).expect(HttpStatus.BAD_REQUEST);
    await unsubscribe('no-es-un-token').expect(HttpStatus.BAD_REQUEST);
    await request(t.app.getHttpServer()).post('/users/unsubscribe').expect(HttpStatus.BAD_REQUEST);

    expect(await notificationsOf(user)).toBe(true);
  });
});
