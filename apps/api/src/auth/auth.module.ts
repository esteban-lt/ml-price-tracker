import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { TypeOrmModule } from '@nestjs/typeorm';

import { MailModule } from '../mail/mail.module.js';
import { User } from '../users/entities/user.entity.js';
import { UsersModule } from '../users/users.module.js';
import { EmailVerificationCode } from './entities/email-verification-code.entity.js';
import { Session } from './entities/session.entity.js';
import { PasswordResetToken } from './entities/password-reset-token.entity.js';
import { EmailVerificationService } from './email-verification.service.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { EmailVerificationStrategy } from './strategies/email-verification.strategy.js';
import { SessionsService } from './sessions.service.js';
import { RefreshTokenCookie } from './refresh-token-cookie.js';
import { PasswordHasher } from './password-hasher.js';
import { PasswordResetService } from './password-reset.service.js';

@Module({
  controllers: [AuthController],
  imports: [
    PassportModule,

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow('JWT_SECRET'),
        signOptions: {
          algorithm: 'HS256',
          expiresIn: configService.getOrThrow('JWT_EXPIRES_IN'),
          issuer: configService.getOrThrow('JWT_ISSUER'),
          audience: configService.getOrThrow('JWT_AUDIENCE'),
        },
      }),
    }),

    TypeOrmModule.forFeature([EmailVerificationCode, PasswordResetToken, Session, User]),
    MailModule,
    UsersModule,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    EmailVerificationStrategy,
    EmailVerificationService,
    SessionsService,
    RefreshTokenCookie,
    PasswordHasher,
    PasswordResetService,
  ],
})
export class AuthModule {}
