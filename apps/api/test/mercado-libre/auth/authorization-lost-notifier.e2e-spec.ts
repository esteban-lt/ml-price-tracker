import { HttpService } from '@nestjs/axios';

import { AuthorizationLostNotifier } from '../../../src/mercado-libre/auth/authorization-lost-notifier.js';
import { MercadoLibreToken } from '../../../src/mercado-libre/auth/entities/mercado-libre-token.entity.js';
import { TEST_ADMIN_EMAIL } from '../../support/setup-env.js';
import { createTestApp, TestApp } from '../../support/test-app.js';

describe('Aviso de autorización perdida de Mercado Libre (e2e)', () => {
  let t: TestApp;
  let notifier: AuthorizationLostNotifier;
  const notifiedAt = async () =>
    (await t.dataSource.getRepository(MercadoLibreToken).findOneByOrFail({ id: 1 })).authorizationLostNotifiedAt;

  beforeAll(async () => {
    t = await createTestApp();
    notifier = t.app.get(AuthorizationLostNotifier);
  });

  afterAll(async () => {
    await t.close();
  });

  beforeEach(async () => {
    await t.reset();
    await t.dataSource.getRepository(MercadoLibreToken).save({ id: 1, refreshToken: 'TG-expired' });
  });

  it('avisa por correo a los administradores una sola vez cada 24 horas', async () => {
    await notifier.notify();
    await Promise.all([notifier.notify(), notifier.notify()]);

    expect(t.mail.sentTo(TEST_ADMIN_EMAIL)).toHaveLength(1);
    expect(t.mail.sentTo(TEST_ADMIN_EMAIL)[0].subject).toMatch(/autorización de Mercado Libre/);

    await t.dataSource.query(`UPDATE mercado_libre_token SET authorization_lost_notified_at = now() - interval '25 hours'`);
    await notifier.notify();
    expect(t.mail.sentTo(TEST_ADMIN_EMAIL)).toHaveLength(2);
  });

  it('si el correo falla, libera el aviso para reintentarlo en la siguiente falla', async () => {
    t.mail.failWith(() => new Error('Resend caído'));

    await expect(notifier.notify()).rejects.toThrow('Resend caído');
    expect(await notifiedAt()).toBeNull();

    t.mail.reset();
    await notifier.notify();
    expect(t.mail.sentTo(TEST_ADMIN_EMAIL)).toHaveLength(1);
    expect(await notifiedAt()).not.toBeNull();
  });

  it('todas las peticiones a Mercado Libre usan el timeout configurado (10 s)', () => {
    expect(t.app.get(HttpService, { strict: false }).axiosRef.defaults.timeout).toBe(10_000);
  });
});
