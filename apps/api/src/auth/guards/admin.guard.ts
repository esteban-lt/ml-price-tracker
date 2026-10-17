import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { UserResponseDto } from '../../users/dto/user-response.dto.js';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly adminEmails: Set<string>;

  constructor(configService: ConfigService) {
    this.adminEmails = new Set(
      configService
        .get<string>('ADMIN_EMAILS', '')
        .split(',')
        .map(normalizeEmail)
        .filter(Boolean),
    );
  }

  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<{ user?: UserResponseDto }>().user;
    if (!user || !this.adminEmails.has(normalizeEmail(user.email))) {
      throw new ForbiddenException('Solo un administrador puede usar este endpoint');
    }
    return true;
  }
}
