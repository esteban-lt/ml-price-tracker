import request from 'supertest';
import { HttpStatus } from '@nestjs/common';

import { Alert } from '../../src/alerts/entities/alert.entity.js';
import { User } from '../../src/users/entities/user.entity.js';
import {
  createAlert,
  createProduct,
  createSnapshot,
  createTracking,
  createUser,
  minutesAgo,
} from '../support/factories.js';
import { createTestApp, TestApp } from '../support/test-app.js';

describe('AlertsController (e2e): bandeja de alertas', () => {
  let t: TestApp;
  let owner: User;
  let other: User;

  const as = (user: User) => ({ Authorization: `Bearer ${t.tokenFor(user)}` });
  const http = () => request(t.app.getHttpServer());

  // Crea `count` alertas para `user`, la más reciente al final.
  const givenAlerts = async (user: User, count: number) => {
    const product = await createProduct(t.dataSource);
    const tracking = await createTracking(t.dataSource, { user, product, createdAt: minutesAgo(60) });
    const alerts: Alert[] = [];
    for (let i = count; i > 0; i--) {
      const snapshot = await createSnapshot(t.dataSource, product, 800 + i, minutesAgo(i));
      alerts.push(await createAlert(t.dataSource, { tracking, snapshot, createdAt: minutesAgo(i) }));
    }
    return alerts;
  };
  const unreadCount = async (user: User) =>
    (await http().get('/alerts/unread-count').set(as(user)).expect(HttpStatus.OK)).body.count;

  beforeAll(async () => {
    t = await createTestApp();
  });

  afterAll(async () => {
    await t.close();
  });

  beforeEach(async () => {
    await t.reset();
    owner = await createUser(t.dataSource);
    other = await createUser(t.dataSource);
  });

  it('lista las alertas del usuario, más recientes primero y paginadas', async () => {
    const alerts = await givenAlerts(owner, 3);
    await givenAlerts(other, 2);

    const page1 = await http().get('/alerts?limit=2').set(as(owner)).expect(HttpStatus.OK);
    const page2 = await http().get('/alerts?limit=2&page=2').set(as(owner)).expect(HttpStatus.OK);

    expect(page1.body.total).toBe(3);
    expect(page1.body.items.map((alert: Alert) => alert.id)).toEqual([alerts[2].id, alerts[1].id]);
    expect(page2.body.items.map((alert: Alert) => alert.id)).toEqual([alerts[0].id]);
    expect(page1.body.items[0]).toMatchObject({ price: expect.any(Number), product: { id: expect.any(String) } });
  });

  it('cuenta las no leídas y filtra con unread=true', async () => {
    const [first] = await givenAlerts(owner, 3);
    await t.dataSource.getRepository(Alert).update(first.id, { readAt: new Date() });

    expect(await unreadCount(owner)).toBe(2);
    const unread = await http().get('/alerts?unread=true').set(as(owner)).expect(HttpStatus.OK);
    expect(unread.body.total).toBe(2);
  });

  it('marcar como leída es idempotente', async () => {
    const [alert] = await givenAlerts(owner, 1);

    await http().patch(`/alerts/${alert.id}/read`).set(as(owner)).expect(HttpStatus.NO_CONTENT);
    const { readAt } = await t.dataSource.getRepository(Alert).findOneByOrFail({ id: alert.id });
    await http().patch(`/alerts/${alert.id}/read`).set(as(owner)).expect(HttpStatus.NO_CONTENT);

    const after = await t.dataSource.getRepository(Alert).findOneByOrFail({ id: alert.id });
    expect(readAt).not.toBeNull();
    expect(after.readAt).toEqual(readAt);
  });

  it('la alerta de otro usuario responde 404', async () => {
    const [foreign] = await givenAlerts(other, 1);

    await http().patch(`/alerts/${foreign.id}/read`).set(as(owner)).expect(HttpStatus.NOT_FOUND);
    expect(await unreadCount(other)).toBe(1);
  });

  it('marcar todas solo afecta al usuario autenticado', async () => {
    await givenAlerts(owner, 2);
    await givenAlerts(other, 2);

    await http().patch('/alerts/read-all').set(as(owner)).expect(HttpStatus.NO_CONTENT);

    expect(await unreadCount(owner)).toBe(0);
    expect(await unreadCount(other)).toBe(2);
  });
});
