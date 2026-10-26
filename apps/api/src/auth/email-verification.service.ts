import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';

import { BadRequestException, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { MailService } from '../mail/mail.service.js';
import { User } from '../users/entities/user.entity.js';
import { EmailVerificationCode } from './entities/email-verification-code.entity.js';
import { buildVerificationEmail } from './verification-email.template.js';
import { VerificationCodeCooldownException } from './exceptions/verification-code-cooldown.exception.js';

const CODE_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);
  private readonly secret: string;

  constructor(
    @InjectRepository(EmailVerificationCode)
    private readonly codeRepository: Repository<EmailVerificationCode>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly mailService: MailService,
    private readonly dataSource: DataSource,
    configService: ConfigService,
  ) {
    this.secret = configService.getOrThrow<string>('VERIFICATION_CODE_SECRET');
  }

  // Para el registro: no retrasa la respuesta y un fallo solo se registra (el usuario puede pedir el reenvío).
  sendCodeInBackground(user: User): void {
    this.sendCode(user).catch((error: unknown) => {
      if (error instanceof VerificationCodeCooldownException) return;
      this.logger.error(`No se pudo enviar el código de verificación al usuario ${user.id}: ${(error as Error).message}`);
    });
  }

  async resendCode(userId: string): Promise<void> {
    const user = await this.userRepository.findOneByOrFail({ id: userId });
    if (user.emailVerifiedAt) return;

    try {
      await this.sendCode(user);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`No se pudo reenviar el código de verificación al usuario ${user.id}: ${(error as Error).message}`);
      throw new HttpException('No se pudo enviar el correo; intenta de nuevo en un minuto', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  // Devuelve el usuario actualizado. Si ya estaba verificado, no cambia nada.
  async verify(userId: string, code: string): Promise<User> {
    const user = await this.userRepository.findOneByOrFail({ id: userId });
    if (user.emailVerifiedAt) return user;

    // El intento se cuenta antes de comparar para que peticiones en paralelo no superen el límite.
    const [claimed] = (await this.codeRepository.query(
      `UPDATE email_verification_codes SET attempts = attempts + 1
       WHERE user_id = $1 AND expires_at > now() AND attempts < $2
       RETURNING code_hash, attempts`,
      [userId, MAX_ATTEMPTS],
    )) as [{ code_hash: string; attempts: number }[], number];
    const row = claimed[0];
    if (!row) throw await this.unusableCodeError(userId);

    if (!this.matches(row.code_hash, userId, code)) {
      const remaining = MAX_ATTEMPTS - row.attempts;
      throw new BadRequestException(
        remaining > 0
          ? `El código es incorrecto; te ${remaining === 1 ? 'queda 1 intento' : `quedan ${remaining} intentos`}`
          : 'El código es incorrecto y ya no te quedan intentos; solicita un código nuevo',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.update(User, userId, { emailVerifiedAt: () => 'now()' });
      await manager.delete(EmailVerificationCode, { userId });
    });
    return this.userRepository.findOneByOrFail({ id: userId });
  }

  private async sendCode(user: User): Promise<void> {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');

    // Reemplaza el código anterior solo si se creó hace más de RESEND_COOLDOWN_SECONDS
    // (creado = expira - CODE_TTL_MINUTES); si no, no devuelve fila.
    const inserted = (await this.codeRepository.query(
      `INSERT INTO email_verification_codes (user_id, code_hash, expires_at, attempts)
       VALUES ($1, $2, now() + make_interval(mins => $3), 0)
       ON CONFLICT (user_id) DO UPDATE
         SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at, attempts = 0
         WHERE email_verification_codes.expires_at <= now() + make_interval(mins => $3, secs => $4)
       RETURNING user_id`,
      [user.id, this.hash(user.id, code), CODE_TTL_MINUTES, -RESEND_COOLDOWN_SECONDS],
    )) as unknown[];
    if (inserted.length === 0) throw await this.cooldownError(user.id);

    await this.mailService.send({ to: user.email, ...buildVerificationEmail(code, CODE_TTL_MINUTES) });
  }

  private async cooldownError(userId: string): Promise<VerificationCodeCooldownException> {
    const current = await this.codeRepository.findOneByOrFail({ userId });
    const createdAt = current.expiresAt.getTime() - CODE_TTL_MINUTES * 60_000;
    const seconds = Math.max(1, Math.ceil((createdAt + RESEND_COOLDOWN_SECONDS * 1000 - Date.now()) / 1000));
    return new VerificationCodeCooldownException(seconds);
  }

  private async unusableCodeError(userId: string): Promise<BadRequestException> {
    const current = await this.codeRepository.findOneBy({ userId });
    if (!current) return new BadRequestException('No tienes un código activo; solicita uno nuevo');
    if (current.attempts >= MAX_ATTEMPTS) {
      return new BadRequestException('Superaste el máximo de intentos; solicita un código nuevo');
    }
    return new BadRequestException('El código venció; solicita uno nuevo');
  }

  private hash(userId: string, code: string): string {
    return createHmac('sha256', this.secret).update(`${userId}:${code}`).digest('hex');
  }

  private matches(storedHash: string, userId: string, code: string): boolean {
    return timingSafeEqual(Buffer.from(storedHash, 'hex'), Buffer.from(this.hash(userId, code), 'hex'));
  }
}
