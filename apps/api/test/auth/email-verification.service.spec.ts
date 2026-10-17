import { BadRequestException } from '@nestjs/common';

import { EmailVerificationService } from '../../src/auth/email-verification.service.js';
import { FakeMailService } from '../support/fakes/fake-mail.service.js';

const SECRET = 'unit-test-verification-secret-32-chars';

// La base se simula: el INSERT del código guarda el hash recibido y el UPDATE de verificación
// lo devuelve, como haría Postgres.
function setup() {
  const mail = new FakeMailService();
  const stored = new Map<string, string>();
  const users = new Map([
    ['user-a', { id: 'user-a', email: 'a@example.test', emailVerifiedAt: null }],
    ['user-b', { id: 'user-b', email: 'b@example.test', emailVerifiedAt: null }],
  ]);

  const codeRepository = {
    query: vi.fn(async (sql: string, params: unknown[]) => {
      const userId = params[0] as string;
      if (sql.includes('INSERT')) {
        stored.set(userId, params[1] as string);
        return [{ user_id: userId }];
      }
      return [[{ code_hash: stored.get(userId), attempts: 1 }], 1];
    }),
  };
  const service = new EmailVerificationService(
    codeRepository as never,
    { findOneByOrFail: async ({ id }: { id: string }) => users.get(id) } as never,
    mail as never,
    { transaction: async () => undefined } as never,
    { getOrThrow: () => SECRET } as never,
  );
  const hash = (userId: string, code: string): string => service['hash'](userId, code);
  return { service, mail, stored, hash };
}

describe('EmailVerificationService (código)', () => {
  it('genera códigos de 6 dígitos y solo guarda su hash', async () => {
    const { service, mail, stored } = setup();

    for (let i = 0; i < 20; i++) await service.resendCode('user-a');

    for (const message of mail.sent) expect(message.text).toMatch(/\b\d{6}\b/);
    const code = mail.lastCodeFor('a@example.test')!;
    expect(stored.get('user-a')).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.get('user-a')).not.toContain(code);
  });

  it('el HMAC depende del usuario', () => {
    const { hash } = setup();
    expect(hash('user-a', '123456')).not.toBe(hash('user-b', '123456'));
    expect(hash('user-a', '123456')).toBe(hash('user-a', '123456'));
  });

  it('un código enviado a otro usuario no sirve', async () => {
    const { service, mail } = setup();
    await service.resendCode('user-a');
    await service.resendCode('user-b');
    const codeOfA = mail.lastCodeFor('a@example.test')!;
    const codeOfB = mail.lastCodeFor('b@example.test')!;

    await expect(service.verify('user-b', codeOfA === codeOfB ? '000000' : codeOfA)).rejects.toThrow(
      BadRequestException,
    );
    await expect(service.verify('user-a', codeOfA)).resolves.toBeDefined();
  });
});
