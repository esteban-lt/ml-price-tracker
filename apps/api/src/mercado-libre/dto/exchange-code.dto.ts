import { IsNotEmpty, IsString } from 'class-validator';

export class ExchangeCodeDto {
  @IsString()
  @IsNotEmpty({ message: 'Debe enviar el code que regresó el callback de autorización' })
  code: string;
}
