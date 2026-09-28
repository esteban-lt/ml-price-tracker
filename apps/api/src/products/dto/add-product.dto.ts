import { IsNotEmpty, IsUrl } from 'class-validator';

export class AddProductDto {
  @IsNotEmpty()
  @IsUrl()
  url: string;
}
