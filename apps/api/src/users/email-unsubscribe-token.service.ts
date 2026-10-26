import { createHmac, timingSafeEqual } from 'node:crypto';
import { isUUID } from 'class-validator';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const PURPOSE = 'email-unsubscribe';

@Injectable()
export class EmailUnsubscribeTokenService {
  private readonly secret: string;

  constructor(configService: ConfigService) {
    this.secret = configService.getOrThrow<string>('JWT_SECRET');
  }

  create(userId: string): string {
    return `${userId}.${this.sign(userId)}`;
  }

  verify(token: string): string | null {
    const [userId, signature] = token.split('.');
    if (!isUUID(userId) || !signature) return null;

    const expected = Buffer.from(this.sign(userId));
    const received = Buffer.from(signature);
    return received.length === expected.length && timingSafeEqual(received, expected) ? userId : null;
  }

  private sign(userId: string): string {
    return createHmac('sha256', this.secret).update(`${PURPOSE}:${userId}`).digest('base64url');
  }
}
