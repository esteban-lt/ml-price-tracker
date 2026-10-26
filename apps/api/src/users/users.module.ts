import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity.js';
import { EmailUnsubscribeTokenService } from './email-unsubscribe-token.service.js';

@Module({
  controllers: [UsersController],
  imports: [TypeOrmModule.forFeature([User])],
  exports: [UsersService, EmailUnsubscribeTokenService],
  providers: [UsersService, EmailUnsubscribeTokenService],
})
export class UsersModule {}
