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

  async create(createUserDto: CreateUserDto) {
    const exists = await this.findByEmail(createUserDto.email);
    if(exists) throw new BadRequestException('User already exists');
    const user = this.usersRepository.create(createUserDto);
    return this.usersRepository.save(user);
  }

  async findById(id: string): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.usersRepository.findOne({ where: { email } });
  }

  async updateEmailNotifications(id: string, enabled: boolean): Promise<UserResponseDto> {
    const user = await this.usersRepository.findOneByOrFail({ id });
    user.emailNotifications = enabled;
    return UserMapper.toResponse(await this.usersRepository.save(user));
  }
}
