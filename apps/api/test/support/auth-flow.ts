import request from 'supertest';
import { HttpStatus } from '@nestjs/common';

import { TestApp } from './test-app.js';

export const TEST_PASSWORD = 'Str0ng-Passw0rd!';

export async function waitForVerificationCode(t: TestApp, email: string): Promise<string> {
  await vi.waitFor(() => expect(t.mail.lastCodeFor(email)).toBeDefined());
  return t.mail.lastCodeFor(email)!;
}

export async function registerVerifiedUser(
  t: TestApp,
  { name = 'Ana', email, password = TEST_PASSWORD }: { name?: string; email: string; password?: string },
): Promise<request.Response> {
  const http = () => request(t.app.getHttpServer());
  const { body } = await http().post('/auth/register').send({ name, email, password }).expect(HttpStatus.CREATED);
  const code = await waitForVerificationCode(t, email);

  return http()
    .post('/auth/verify-email')
    .set('Authorization', `Bearer ${body.verificationToken}`)
    .send({ code })
    .expect(HttpStatus.OK);
}
