import { ExtractJwt, Strategy } from 'passport-jwt';
import { isUUID } from 'class-validator';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';

import { UsersService } from '../../users/users.service.js';
import { UserMapper } from '../../users/mappers/user.mapper.js';
import { EMAIL_VERIFICATION_TOKEN_AUDIENCE } from '../email-verification-token.constants.js';
import { EmailVerificationTokenPayload } from '../interfaces/email-verification-token-payload.js';
import { PasswordHasher } from '../password-hasher.js';

export const EMAIL_VERIFICATION_STRATEGY = 'email-verification';

@Injectable()
export class EmailVerificationStrategy extends PassportStrategy(Strategy, EMAIL_VERIFICATION_STRATEGY) {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordHasher: PasswordHasher,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      algorithms: ['HS256'],
      issuer: configService.getOrThrow<string>('JWT_ISSUER'),
      audience: EMAIL_VERIFICATION_TOKEN_AUDIENCE,
    });
  }

  async validate(payload: Partial<EmailVerificationTokenPayload>) {
    if(!isUUID(payload.sub)) throw new UnauthorizedException('Invalid verification token');

    const user = await this.usersService.findById(payload.sub!);
    if(!user || user.emailVerifiedAt || payload.passwordFingerprint !== this.passwordHasher.fingerprint(user.password)) {
      throw new UnauthorizedException('Invalid verification token');
    }
    return UserMapper.toResponse(user);
  }
}
