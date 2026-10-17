import { Logger } from '@nestjs/common';

import { MailRateLimitError, MailService } from '../../src/mail/mail.service.js';

// SDK de Resend simulado: `emails.send` devuelve { data, error } como el real (no lanza).
const resend = vi.hoisted(() => ({ send: vi.fn(), constructed: vi.fn() }));
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: resend.send };
    constructor(apiKey: string) {
      resend.constructed(apiKey);
    }
  },
}));

const API_KEY = 're_test_secret_key_123';
const message = {
  to: 'ana@example.test',
  subject: 'Bajó de precio',
  html: '<p>contenido html privado</p>',
  text: 'contenido en texto plano',
};
const mailService = (apiKey: string) =>
  new MailService({
    get: () => apiKey,
    getOrThrow: () => 'Nudge <hola@example.test>',
  } as never);

describe('MailService', () => {
  beforeEach(() => {
    resend.send.mockReset();
    resend.constructed.mockReset();
  });

  it('envía el correo con el remitente configurado', async () => {
    resend.send.mockResolvedValue({ data: { id: 'email-id' }, error: null });

    await mailService(API_KEY).send(message);

    expect(resend.constructed).toHaveBeenCalledWith(API_KEY);
    expect(resend.send).toHaveBeenCalledWith({ from: 'Nudge <hola@example.test>', ...message });
  });

  it.each(['rate_limit_exceeded', 'daily_quota_exceeded', 'monthly_quota_exceeded'])(
    'convierte %s en MailRateLimitError',
    async (name) => {
      resend.send.mockResolvedValue({ data: null, error: { name, message: 'Too many requests', statusCode: 429 } });

      await expect(mailService(API_KEY).send(message)).rejects.toBeInstanceOf(MailRateLimitError);
    },
  );

  it('cualquier otro error se convierte en un mensaje seguro', async () => {
    resend.send.mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'Invalid `to` field', statusCode: 422 },
    });

    const error = await mailService(API_KEY).send(message).catch((caught: Error) => caught);

    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(MailRateLimitError);
    expect(error!.message).toMatch(/422.*validation_error/);
    for (const secret of [API_KEY, message.html, message.text]) expect(error!.message).not.toContain(secret);
  });

  it('sin key registra el texto plano (nunca el HTML) y cuenta como enviado', async () => {
    const logged: unknown[] = [];
    const log = vi.spyOn(Logger.prototype, 'log').mockImplementation((...args: unknown[]) => void logged.push(...args));

    await expect(mailService('').send(message)).resolves.toBeUndefined();

    expect(resend.constructed).not.toHaveBeenCalled();
    expect(resend.send).not.toHaveBeenCalled();
    expect(JSON.stringify(logged)).toContain(message.text);
    expect(JSON.stringify(logged)).not.toContain(message.html);
    log.mockRestore();
  });
});
