import { DataSource, Repository } from 'typeorm';

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { MailService } from '../mail/mail.service.js';
import { User } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { PasswordResetToken } from './entities/password-reset-token.entity.js';
import { generateOpaqueToken, hashOpaqueToken } from './opaque-token.js';
import { PasswordHasher } from './password-hasher.js';
import { buildPasswordResetEmail } from './password-reset-email.template.js';
import { SessionsService } from './sessions.service.js';

const TOKEN_TTL_MINUTES = 30;
const REQUEST_COOLDOWN_SECONDS = 60;

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly frontendUrl: string;

  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly tokenRepository: Repository<PasswordResetToken>,

    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly passwordHasher: PasswordHasher,
    private readonly mailService: MailService,
    private readonly dataSource: DataSource,
    configService: ConfigService,
  ) {
    this.frontendUrl = configService.getOrThrow<string>('FRONTEND_URL').replace(/\/+$/, '');
  }

  async requestReset(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return;

    const token = generateOpaqueToken();
    const stored = (await this.tokenRepository.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at)
       VALUES ($1, $2, now() + make_interval(mins => $3), now())
       ON CONFLICT (user_id) DO UPDATE
         SET token_hash = EXCLUDED.token_hash, expires_at = EXCLUDED.expires_at, created_at = EXCLUDED.created_at
         WHERE password_reset_tokens.created_at <= now() - make_interval(secs => $4)
       RETURNING user_id`,
      [user.id, hashOpaqueToken(token), TOKEN_TTL_MINUTES, REQUEST_COOLDOWN_SECONDS],
    )) as unknown[];
    if (stored.length === 0) return;

    this.sendEmailInBackground(user, token);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const passwordHash = await this.passwordHasher.hash(newPassword);

    const userId = await this.dataSource.transaction(async (manager) => {
      const { raw } = await manager
        .createQueryBuilder()
        .delete()
        .from(PasswordResetToken)
        .where('token_hash = :tokenHash AND expires_at > now()', { tokenHash: hashOpaqueToken(token) })
        .returning('user_id')
        .execute();
      const consumed = (raw as { user_id: string }[])[0];
      if (!consumed) throw new BadRequestException('El enlace no es válido o ya venció; solicita uno nuevo');

      await manager.update(User, consumed.user_id, {
        password: passwordHash,
        emailVerifiedAt: () => 'COALESCE(email_verified_at, now())',
      });
      return consumed.user_id;
    });

    await this.sessionsService.revokeAll(userId);
  }

  private sendEmailInBackground(user: User, token: string): void {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${token}`;
    this.mailService
      .send({ to: user.email, ...buildPasswordResetEmail(resetUrl, TOKEN_TTL_MINUTES) })
      .catch((error: unknown) => {
        this.logger.error(`No se pudo enviar el correo de recuperación al usuario ${user.id}: ${(error as Error).message}`);
      });
  }
}
