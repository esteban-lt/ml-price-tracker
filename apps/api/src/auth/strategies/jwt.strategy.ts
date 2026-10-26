import { ExtractJwt, Strategy } from 'passport-jwt';
import { isUUID } from 'class-validator';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';

import { SessionsService } from '../sessions.service.js';
import { JwtPayload } from '../interfaces/jwt-payload.js';
import { UserMapper } from '../../users/mappers/user.mapper.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly sessionsService: SessionsService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      algorithms: ['HS256'],
      issuer: configService.getOrThrow<string>('JWT_ISSUER'),
      audience: configService.getOrThrow<string>('JWT_AUDIENCE'),
    });
  }

  // Firma, iss, aud y exp ya los verificó passport-jwt; aquí se exige que la sesión siga vigente,
  // así logout, logout-all y la detección de reuso cortan el acceso al instante.
  async validate(payload: Partial<JwtPayload>) {
    if(!isUUID(payload.sub) || !isUUID(payload.sid)) throw new UnauthorizedException('Invalid session');

    const user = await this.sessionsService.findVerifiedUserWithActiveSession(payload.sub!, payload.sid!);
    if(!user) throw new UnauthorizedException('Invalid session');
    return UserMapper.toResponse(user);
  }
}
