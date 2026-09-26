import { UserResponseDto } from '../../users/dto/user-response.dto.js';

export class AuthResponseDto {
  user: UserResponseDto;
  token: string;
}
