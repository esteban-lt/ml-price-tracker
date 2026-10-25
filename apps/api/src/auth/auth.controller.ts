import type { Request, Response } from 'express';

import { Controller, Get, Post, Body, HttpCode, HttpStatus, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthResult, AuthService } from './auth.service.js';
import { CreateUserDto } from '../users/dto/create-user.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { Auth } from './decorators/auth.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { UserResponseDto } from '../users/dto/user-response.dto.js';
import { RATE_LIMITS } from '../config/throttler.js';
import { UserMapper } from '../users/mappers/user.mapper.js';
import { EmailVerificationService } from './email-verification.service.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { RefreshTokenCookie } from './refresh-token-cookie.js';
import { SessionClient } from './sessions.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly refreshTokenCookie: RefreshTokenCookie,
  ) {}

  @Post('register')
  @Throttle({ default: RATE_LIMITS.auth })
  async register(
    @Body() createUserDto: CreateUserDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    return this.withCookie(response, await this.authService.register(createUserDto, clientOf(request)));
  }

  @Post('login')
  @Throttle({ default: RATE_LIMITS.auth })
  async login(
    @Body() loginDto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    return this.withCookie(response, await this.authService.login(loginDto, clientOf(request)));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<AuthResponseDto> {
    const token = this.refreshTokenCookie.read(request);
    if(!token) throw new UnauthorizedException('Invalid session');
    return this.withCookie(response, await this.authService.refresh(token, clientOf(request)));
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response): Promise<void> {
    const token = this.refreshTokenCookie.read(request);
    if(token) await this.authService.logout(token);
    this.refreshTokenCookie.clear(response);
  }

  @Post('logout-all')
  @Auth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async logoutAll(@CurrentUser() user: UserResponseDto, @Res({ passthrough: true }) response: Response): Promise<void> {
    await this.authService.logoutAll(user.id);
    this.refreshTokenCookie.clear(response);
  }

  @Get('me')
  @Auth()
  me(@CurrentUser() user: UserResponseDto) {
    return user;
  }

  @Post('verify-email')
  @Auth()
  @Throttle({ default: RATE_LIMITS.auth })
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@CurrentUser() user: UserResponseDto, @Body() { code }: VerifyEmailDto): Promise<UserResponseDto> {
    return UserMapper.toResponse(await this.emailVerificationService.verify(user.id, code));
  }

  @Post('resend-verification')
  @Auth()
  @Throttle({ default: RATE_LIMITS.auth })
  @HttpCode(HttpStatus.NO_CONTENT)
  resendVerification(@CurrentUser() user: UserResponseDto): Promise<void> {
    return this.emailVerificationService.resendCode(user.id);
  }

  private withCookie(response: Response, { body, refreshToken }: AuthResult): AuthResponseDto {
    this.refreshTokenCookie.set(response, refreshToken);
    return body;
  }
}

function clientOf(request: Request): SessionClient {
  return { userAgent: request.get('user-agent'), ip: request.ip };
}
