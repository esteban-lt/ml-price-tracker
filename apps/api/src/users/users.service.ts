import { Repository } from 'typeorm';

import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { CreateUserDto } from './dto/create-user.dto.js';
import { User } from './entities/user.entity.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { UserMapper } from './mappers/user.mapper.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async registerOrReplaceUnverified(createUserDto: CreateUserDto): Promise<User> {
    const existing = await this.findByEmail(createUserDto.email);
    if(existing?.emailVerifiedAt) throw new BadRequestException('User already exists');
    return this.usersRepository.save(this.usersRepository.merge(existing ?? this.usersRepository.create(), createUserDto));
  }

  async findById(id: string): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { email } });
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.usersRepository.update(id, { password: passwordHash });
  }

  async delete(id: string): Promise<void> {
    await this.usersRepository.delete(id);
  }

  async disableEmailNotifications(id: string): Promise<void> {
    await this.usersRepository.update(id, { emailNotifications: false });
  }

  async updateEmailNotifications(id: string, enabled: boolean): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOneByOrFail({ id });
    user.emailNotifications = enabled;
    return UserMapper.toResponse(await this.usersRepository.save(user));
  }
}
