import { Controller, Get, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { CreateUserDto } from '../users/dto/create-user.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { Auth } from './decorators/auth.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { UserResponseDto } from '../users/dto/user-response.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('me')
  @Auth()
  me(@CurrentUser() user: UserResponseDto) {
    return user;
  }
}
