import type { Request, Response } from 'express';

import { Controller, Get, Post, Body, Delete, HttpCode, HttpStatus, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthResult, AuthService } from './auth.service.js';
import { CreateUserDto } from '../users/dto/create-user.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { Auth } from './decorators/auth.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { UserResponseDto } from '../users/dto/user-response.dto.js';
import { RATE_LIMITS } from '../config/throttler.js';
import { EmailVerificationService } from './email-verification.service.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { EmailVerificationRequiredDto } from './dto/email-verification-required.dto.js';
import { EmailVerificationAuth } from './decorators/email-verification-auth.decorator.js';
import { RefreshTokenCookie } from './refresh-token-cookie.js';
import { PasswordResetService } from './password-reset.service.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { DeleteAccountDto } from './dto/delete-account.dto.js';
import { SessionClient } from './sessions.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly refreshTokenCookie: RefreshTokenCookie,
    private readonly passwordResetService: PasswordResetService,
  ) {}

  @Post('register')
  @Throttle({ default: RATE_LIMITS.auth })
  register(@Body() createUserDto: CreateUserDto): Promise<EmailVerificationRequiredDto> {
    return this.authService.register(createUserDto);
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

  @Delete('me')
  @Auth()
  @Throttle({ default: RATE_LIMITS.auth })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(
    @CurrentUser() user: UserResponseDto,
    @Body() { password }: DeleteAccountDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.deleteAccount(user.id, password);
    this.refreshTokenCookie.clear(response);
  }

  @Post('change-password')
  @Auth()
  @Throttle({ default: RATE_LIMITS.auth })
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: UserResponseDto,
    @Body() changePasswordDto: ChangePasswordDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    return this.withCookie(response, await this.authService.changePassword(user.id, changePasswordDto, clientOf(request)));
  }

  @Post('forgot-password')
  @Throttle({ default: RATE_LIMITS.auth })
  @HttpCode(HttpStatus.NO_CONTENT)
  forgotPassword(@Body() { email }: ForgotPasswordDto): Promise<void> {
    return this.passwordResetService.requestReset(email);
  }

  @Post('reset-password')
  @Throttle({ default: RATE_LIMITS.auth })
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(@Body() { token, password }: ResetPasswordDto): Promise<void> {
    return this.passwordResetService.resetPassword(token, password);
  }

  @Post('verify-email')
  @EmailVerificationAuth()
  @Throttle({ default: RATE_LIMITS.auth })
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @CurrentUser() user: UserResponseDto,
    @Body() { code }: VerifyEmailDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponseDto> {
    return this.withCookie(response, await this.authService.verifyEmail(user.id, code, clientOf(request)));
  }

  @Post('resend-verification')
  @EmailVerificationAuth()
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
