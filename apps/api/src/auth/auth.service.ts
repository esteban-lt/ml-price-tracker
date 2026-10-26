import bcrypt from 'bcrypt';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { UsersService } from '../users/users.service.js';
import { CreateUserDto } from '../users/dto/create-user.dto.js';
import { User } from '../users/entities/user.entity.js';
import { LoginDto } from './dto/login.dto.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { EmailVerificationRequiredDto } from './dto/email-verification-required.dto.js';
import { JwtPayload } from './interfaces/jwt-payload.js';
import { EmailVerificationTokenPayload } from './interfaces/email-verification-token-payload.js';
import { EmailNotVerifiedException } from './exceptions/email-not-verified.exception.js';
import {
  EMAIL_VERIFICATION_TOKEN_AUDIENCE,
  EMAIL_VERIFICATION_TOKEN_EXPIRES_IN,
} from './email-verification-token.constants.js';
import { UserMapper } from '../users/mappers/user.mapper.js';
import { EmailVerificationService } from './email-verification.service.js';
import { IssuedRefreshToken, IssuedSession, SessionClient, SessionsService } from './sessions.service.js';

// El cuerpo va en la respuesta; el refresh token, en la cookie.
export interface AuthResult {
  body: AuthResponseDto;
  refreshToken: IssuedRefreshToken;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly sessionsService: SessionsService,
  ) {}

  async register(createUserDto: CreateUserDto): Promise<EmailVerificationRequiredDto> {
    const { password } = createUserDto;

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.usersService.create({
      ...createUserDto,
      password: hashedPassword,
    });
    this.emailVerificationService.sendCodeInBackground(user);

    return {
      user: UserMapper.toResponse(user),
      verificationToken: await this.signEmailVerificationToken(user),
    };
  }

  async login(loginDto: LoginDto, client: SessionClient): Promise<AuthResult> {
    const { email, password } = loginDto;

    const user = await this.usersService.findByEmail(email);
    if(!user) throw new UnauthorizedException('Invalid credentials');

    const passwordMatches = await bcrypt.compare(password, user.password);
    if(!passwordMatches) throw new UnauthorizedException('Invalid credentials');

    if(!user.emailVerifiedAt) throw new EmailNotVerifiedException(await this.signEmailVerificationToken(user));

    return this.authenticate(user, await this.sessionsService.create(user.id, client));
  }

  async verifyEmail(userId: string, code: string, client: SessionClient): Promise<AuthResult> {
    const user = await this.emailVerificationService.verify(userId, code);
    return this.authenticate(user, await this.sessionsService.create(user.id, client));
  }

  async refresh(token: string, client: SessionClient): Promise<AuthResult> {
    const { userId, ...session } = await this.sessionsService.rotate(token, client);

    const user = await this.usersService.findById(userId);
    if(!user) throw new UnauthorizedException('Invalid session');

    return this.authenticate(user, session);
  }

  logout(token: string): Promise<void> {
    return this.sessionsService.revoke(token);
  }

  logoutAll(userId: string): Promise<void> {
    return this.sessionsService.revokeAll(userId);
  }

  private signEmailVerificationToken(user: User): Promise<string> {
    const payload: EmailVerificationTokenPayload = { sub: user.id };
    return this.jwtService.signAsync(payload, {
      audience: EMAIL_VERIFICATION_TOKEN_AUDIENCE,
      expiresIn: EMAIL_VERIFICATION_TOKEN_EXPIRES_IN,
    });
  }

  private async authenticate(user: User, { sid, refreshToken }: IssuedSession): Promise<AuthResult> {
    const payload: JwtPayload = { sub: user.id, sid };
    const token = await this.jwtService.signAsync(payload);

    return {
      body: {
        user: UserMapper.toResponse(user),
        token,
      },
      refreshToken,
    };
  }
}
