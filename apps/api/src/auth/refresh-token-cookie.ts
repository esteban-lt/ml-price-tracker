import type { CookieOptions, Request, Response } from 'express';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { IssuedRefreshToken } from './sessions.service.js';

const COOKIE_NAME = 'refresh_token';

// La cookie solo viaja a /auth, que es donde se usa (refresh y logout).
@Injectable()
export class RefreshTokenCookie {
  private readonly options: CookieOptions;

  constructor(configService: ConfigService) {
    const sameSite = configService.getOrThrow<'lax' | 'strict' | 'none'>('REFRESH_COOKIE_SAME_SITE');
    this.options = {
      httpOnly: true,
      secure: configService.getOrThrow<string>('NODE_ENV') === 'production' || sameSite === 'none',
      sameSite,
      path: '/auth',
    };
  }

  read(request: Request): string | undefined {
    const value: unknown = request.cookies?.[COOKIE_NAME];
    return typeof value === 'string' && value ? value : undefined;
  }

  set(response: Response, { token, expiresAt }: IssuedRefreshToken): void {
    response.cookie(COOKIE_NAME, token, { ...this.options, expires: expiresAt });
  }

  clear(response: Response): void {
    response.clearCookie(COOKIE_NAME, this.options);
  }
}
