import { UserResponseDto } from '../../users/dto/user-response.dto.js';

export class EmailVerificationRequiredDto {
  user: UserResponseDto;
  verificationToken: string;
}
