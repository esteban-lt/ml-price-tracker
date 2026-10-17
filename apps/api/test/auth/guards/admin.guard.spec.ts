import { ExecutionContext, ForbiddenException } from '@nestjs/common';

import { AdminGuard } from '../../../src/auth/guards/admin.guard.js';

const guardWith = (adminEmails: string) => new AdminGuard({ get: () => adminEmails } as never);
const contextFor = (user: object) =>
  ({ switchToHttp: () => ({ getRequest: () => ({ user }) }) }) as unknown as ExecutionContext;

const verifiedAdmin = { email: 'admin@example.test', emailVerified: true };

describe('AdminGuard', () => {
  it('con ADMIN_EMAILS vacía no deja pasar a nadie', () => {
    expect(() => guardWith('').canActivate(contextFor(verifiedAdmin))).toThrow(ForbiddenException);
  });

  it('compara sin distinguir mayúsculas ni espacios', () => {
    const guard = guardWith(' Admin@Example.TEST , otro@example.test');
    expect(guard.canActivate(contextFor(verifiedAdmin))).toBe(true);
  });
});
