import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { IsNull, MoreThan, Repository } from 'typeorm';

import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';

import { User } from '../users/entities/user.entity.js';
import { Session } from './entities/session.entity.js';

const DAY_MS = 24 * 60 * 60 * 1000;
// Dos peticiones simultáneas con el mismo token (p. ej. dos pestañas) no cuentan como robo.
const ROTATION_GRACE_MS = 30_000;
const USER_AGENT_MAX_LENGTH = 512;

export interface SessionClient {
  userAgent?: string;
  ip?: string;
}

export interface IssuedRefreshToken {
  token: string;
  expiresAt: Date;
}

// `sid` es la familia: se mantiene al rotar el refresh token y es lo que viaja en el access token.
export interface IssuedSession {
  sid: string;
  refreshToken: IssuedRefreshToken;
}

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);
  private readonly ttlMs: number;

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    configService: ConfigService,
  ) {
    this.ttlMs = configService.getOrThrow<number>('REFRESH_TOKEN_EXPIRES_IN_DAYS') * DAY_MS;
  }

  async create(userId: string, client: SessionClient, familyId: string = randomUUID()): Promise<IssuedSession> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + this.ttlMs);

    await this.sessionRepository.insert({
      userId,
      tokenHash: hashToken(token),
      familyId,
      userAgent: client.userAgent?.slice(0, USER_AGENT_MAX_LENGTH) ?? null,
      ip: client.ip ?? null,
      expiresAt,
    });

    return { sid: familyId, refreshToken: { token, expiresAt } };
  }

  // Revoca el token recibido y emite uno nuevo en la misma familia. Si llega un token ya revocado,
  // alguien más lo tiene: se revoca la familia completa.
  async rotate(token: string, client: SessionClient): Promise<IssuedSession & { userId: string }> {
    const session = await this.sessionRepository.findOneBy({ tokenHash: hashToken(token) });
    if(!session) throw new UnauthorizedException('Invalid session');

    const now = new Date();
    const { affected } = await this.sessionRepository.update(
      { id: session.id, revokedAt: IsNull(), expiresAt: MoreThan(now) },
      { revokedAt: now, lastUsedAt: now },
    );
    if(!affected) {
      if(session.revokedAt && now.getTime() - session.revokedAt.getTime() > ROTATION_GRACE_MS) {
        this.logger.warn(`Refresh token revocado reutilizado; se revoca la familia ${session.familyId} del usuario ${session.userId}`);
        await this.revokeWhere({ familyId: session.familyId });
      }
      throw new UnauthorizedException('Invalid session');
    }

    return { userId: session.userId, ...(await this.create(session.userId, client, session.familyId)) };
  }

  // Para cada petición autenticada: el usuario y la vigencia de su sesión en una sola consulta,
  // resuelta con el índice parcial de familias activas.
  findUserWithActiveSession(userId: string, sid: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.id = :userId', { userId })
      .andWhere((qb) => {
        const active = qb
          .subQuery()
          .select('1')
          .from(Session, 'session')
          .where('session.familyId = :sid', { sid })
          .andWhere('session.userId = user.id')
          .andWhere('session.revokedAt IS NULL')
          .andWhere('session.expiresAt > now()')
          .getQuery();
        return `EXISTS ${active}`;
      })
      .getOne();
  }

  async revoke(token: string): Promise<void> {
    const session = await this.sessionRepository.findOneBy({ tokenHash: hashToken(token) });
    if(session) await this.revokeWhere({ familyId: session.familyId });
  }

  async revokeAll(userId: string): Promise<void> {
    await this.revokeWhere({ userId });
  }

  private async revokeWhere(criteria: { familyId: string } | { userId: string }): Promise<void> {
    await this.sessionRepository.update({ ...criteria, revokedAt: IsNull() }, { revokedAt: new Date() });
  }
}

// El token tiene 256 bits aleatorios, así que basta un SHA-256 sin sal para no guardarlo en claro.
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
