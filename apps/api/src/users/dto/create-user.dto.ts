import { IsEmail, IsString, IsStrongPassword, MinLength } from 'class-validator';

import { NormalizeEmail } from '../decorators/normalize-email.decorator.js';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  name: string;

  @NormalizeEmail()
  @IsEmail()
  email: string;

  @IsStrongPassword()
  password: string;
}
