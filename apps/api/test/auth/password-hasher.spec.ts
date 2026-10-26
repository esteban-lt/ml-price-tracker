import bcrypt from 'bcrypt';

import { PasswordHasher } from '../../src/auth/password-hasher.js';

describe('PasswordHasher', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('acepta solo la contraseña correcta', async () => {
    const hasher = new PasswordHasher();
    const hash = await hasher.hash('Str0ng-Passw0rd!');

    expect(await hasher.matches('Str0ng-Passw0rd!', hash)).toBe(true);
    expect(await hasher.matches('otra', hash)).toBe(false);
  });

  it('sin usuario compara igualmente contra un hash bcrypt y responde false', async () => {
    const hasher = new PasswordHasher();
    const compare = vi.spyOn(bcrypt, 'compare');

    expect(await hasher.matches('Str0ng-Passw0rd!', undefined)).toBe(false);

    expect(compare).toHaveBeenCalledOnce();
    expect(compare.mock.calls[0][1]).toMatch(/^\$2[aby]\$10\$/);
  });

  it('la huella cambia cuando cambia el hash de la contraseña', async () => {
    const hasher = new PasswordHasher();
    const [first, second] = await Promise.all([hasher.hash('Str0ng-Passw0rd!'), hasher.hash('Str0ng-Passw0rd!')]);

    expect(hasher.fingerprint(first)).toBe(hasher.fingerprint(first));
    expect(hasher.fingerprint(first)).not.toBe(hasher.fingerprint(second));
  });
});
