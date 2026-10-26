import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AlertDispatchService } from '../../src/alerts/alert-dispatch.service.js';
import { Alert, AlertStatusEnum } from '../../src/alerts/entities/alert.entity.js';
import { MailRateLimitError } from '../../src/mail/mail.service.js';
import { EmailUnsubscribeTokenService } from '../../src/users/email-unsubscribe-token.service.js';
import { TEST_API_URL, TEST_FRONTEND_ORIGIN } from '../support/setup-env.js';
import { createAlert, createProduct, createSnapshot, createTracking, createUser, minutesAgo } from '../support/factories.js';
import { createTestApp, TestApp } from '../support/test-app.js';

describe('AlertDispatchService (e2e): envío de alertas por correo', () => {
  let t: TestApp;
  let dispatcher: AlertDispatchService;

  const givenAlert = async ({ verified = true, emailNotifications = true, createdAt = new Date() } = {}) => {
    const user = await createUser(t.dataSource, { verified, emailNotifications });
    const product = await createProduct(t.dataSource);
    const tracking = await createTracking(t.dataSource, { user, product, createdAt: minutesAgo(120) });
    const snapshot = await createSnapshot(t.dataSource, product, 850, minutesAgo(10));
    return { user, alert: await createAlert(t.dataSource, { tracking, snapshot, createdAt }) };
  };
  const stateOf = async (alert: Alert) => {
    const { status, attempts } = await t.dataSource.getRepository(Alert).findOneByOrFail({ id: alert.id });
    return { status, attempts };
  };

  beforeAll(async () => {
    t = await createTestApp();
    dispatcher = t.app.get(AlertDispatchService);
  });

  afterAll(async () => {
    await t.close();
  });

  beforeEach(async () => {
    await t.reset();
  });

  it('envía el correo a un usuario verificado con notificaciones activas', async () => {
    const { user, alert } = await givenAlert();

    await dispatcher.run();

    expect(t.mail.sentTo(user.email)).toHaveLength(1);
    expect(await stateOf(alert)).toEqual({ status: AlertStatusEnum.SENT, attempts: 1 });
  });

  it('incluye la baja en un clic (List-Unsubscribe) y un enlace de baja en el cuerpo', async () => {
    const { user } = await givenAlert();

    await dispatcher.run();

    const [message] = t.mail.sentTo(user.email);
    const token = t.app.get(EmailUnsubscribeTokenService).create(user.id);
    expect(message.headers).toEqual({
      'List-Unsubscribe': `<${TEST_API_URL}/users/unsubscribe?token=${token}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    });
    expect(message.text).toContain(`${TEST_FRONTEND_ORIGIN}/unsubscribe?token=${token}`);
  });

  it.each([
    ['sin correo verificado', { verified: false }],
    ['con las notificaciones apagadas', { emailNotifications: false }],
    ['con más de 24 horas', { createdAt: minutesAgo(25 * 60) }],
  ])('omite la alerta %s', async (_case, options) => {
    const { alert } = await givenAlert(options);

    await dispatcher.run();

    expect(t.mail.sent).toHaveLength(0);
    expect((await stateOf(alert)).status).toBe(AlertStatusEnum.SKIPPED);
  });

  it('reintenta hasta el tercer fallo y entonces la marca como failed', async () => {
    const { alert } = await givenAlert();
    t.mail.failWith(() => new Error('Resend respondió 500'));

    await dispatcher.run();
    expect(await stateOf(alert)).toEqual({ status: AlertStatusEnum.PENDING, attempts: 1 });
    await dispatcher.run();
    expect(await stateOf(alert)).toEqual({ status: AlertStatusEnum.PENDING, attempts: 2 });
    await dispatcher.run();
    expect(await stateOf(alert)).toEqual({ status: AlertStatusEnum.FAILED, attempts: 3 });
  });

  it('un límite de Resend detiene la corrida sin contar el intento', async () => {
    const first = await givenAlert({ createdAt: minutesAgo(2) });
    const second = await givenAlert({ createdAt: minutesAgo(1) });
    t.mail.failWith(() => new MailRateLimitError('Resend respondió 429'));

    await dispatcher.run();

    expect(await stateOf(first.alert)).toEqual({ status: AlertStatusEnum.PENDING, attempts: 0 });
    expect(await stateOf(second.alert)).toEqual({ status: AlertStatusEnum.PENDING, attempts: 0 });
  });

  it('dos dispatchers en paralelo (p. ej. dos instancias) no envían la misma alerta dos veces', async () => {
    const alerts = await Promise.all([givenAlert(), givenAlert(), givenAlert()]);
    // Segunda instancia independiente: no comparte el candado en memoria del primer dispatcher.
    const otherInstance = new AlertDispatchService(
      t.app.get(getRepositoryToken(Alert)),
      t.mail as never,
      t.app.get(EmailUnsubscribeTokenService),
      t.app.get(ConfigService),
    );

    await Promise.all([dispatcher.run(), otherInstance.run()]);

    expect(t.mail.sent).toHaveLength(alerts.length);
    expect(new Set(t.mail.sent.map((message) => message.to)).size).toBe(alerts.length);
  });
});
