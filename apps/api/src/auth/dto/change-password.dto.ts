import { IsString, IsStrongPassword } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsStrongPassword()
  newPassword: string;
}
