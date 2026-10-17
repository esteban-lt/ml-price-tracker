import { IsString, Matches } from 'class-validator';

export class VerifyEmailDto {
  @IsString({ message: 'El código debe ser texto' })
  @Matches(/^\d{6}$/, { message: 'El código debe tener 6 dígitos' })
  code: string;
}
