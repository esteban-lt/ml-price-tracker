import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { CreateUserDto } from '../users/dto/create-user.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { Auth } from './decorators/auth.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { UserResponseDto } from '../users/dto/user-response.dto.js';
import { RATE_LIMITS } from '../config/throttler.js';
import { UserMapper } from '../users/mappers/user.mapper.js';
import { EmailVerificationService } from './email-verification.service.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  @Post('register')
  @Throttle({ default: RATE_LIMITS.auth })
  register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Post('login')
  @Throttle({ default: RATE_LIMITS.auth })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
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
}
