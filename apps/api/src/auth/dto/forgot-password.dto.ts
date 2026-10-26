import { IsEmail } from 'class-validator';

import { NormalizeEmail } from '../../users/decorators/normalize-email.decorator.js';

export class ForgotPasswordDto {
  @NormalizeEmail()
  @IsEmail()
  email: string;
}
