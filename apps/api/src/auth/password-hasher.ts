import bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class PasswordHasher {
  private readonly placeholderHash = bcrypt.hash(randomBytes(16).toString('hex'), BCRYPT_ROUNDS);

  hash(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  // Compares against a placeholder hash when there is no user, so both cases take about the same time.
  async matches(password: string, passwordHash: string | undefined): Promise<boolean> {
    const matches = await bcrypt.compare(password, passwordHash ?? (await this.placeholderHash));
    return passwordHash !== undefined && matches;
  }

  fingerprint(passwordHash: string): string {
    return createHash('sha256').update(passwordHash).digest('base64url');
  }
}
