import { IsEmail, IsString } from 'class-validator';

import { NormalizeEmail } from '../../users/decorators/normalize-email.decorator.js';

export class LoginDto {
  @NormalizeEmail()
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
