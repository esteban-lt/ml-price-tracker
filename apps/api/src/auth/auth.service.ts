import bcrypt from 'bcrypt';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { UsersService } from '../users/users.service.js';
import { CreateUserDto } from '../users/dto/create-user.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { JwtPayload } from './interfaces/jwt-payload.js';
import { UserMapper } from '../users/mappers/user.mapper.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(createUserDto: CreateUserDto): Promise<AuthResponseDto> {
    const { password } = createUserDto;

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.usersService.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const payload: JwtPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
    };
    const token = await this.jwtService.signAsync(payload);

    return {
      user: UserMapper.toResponse(user),
      token,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    const user = await this.usersService.findByEmail(email);
    if(!user) throw new UnauthorizedException('Invalid credentials');

    const passwordMatches = await bcrypt.compare(password, user.password);
    if(!passwordMatches) throw new UnauthorizedException('Invalid credentials');

    const payload: JwtPayload = {
      id: user.id,
      name: user.name,
      email: user.email,
    };
    const token = await this.jwtService.signAsync(payload);

    return {
      user: UserMapper.toResponse(user),
      token,
    };
  }
}
