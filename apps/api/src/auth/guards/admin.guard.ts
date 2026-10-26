import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { normalizeEmail, parseAdminEmails } from '../../config/admin-emails.js';
import { UserResponseDto } from '../../users/dto/user-response.dto.js';

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly adminEmails: Set<string>;

  constructor(configService: ConfigService) {
    this.adminEmails = new Set(parseAdminEmails(configService.get<string>('ADMIN_EMAILS', '')));
  }

  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<{ user?: UserResponseDto }>().user;
    if (!user || !this.adminEmails.has(normalizeEmail(user.email))) {
      throw new ForbiddenException('Solo un administrador puede usar este endpoint');
    }
    if (!user.emailVerified) {
      throw new ForbiddenException('Debes verificar tu correo para usar este endpoint');
    }
    return true;
  }
}
