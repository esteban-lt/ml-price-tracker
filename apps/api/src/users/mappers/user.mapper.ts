import { UserResponseDto } from '../dto/user-response.dto.js';
import { User } from '../entities/user.entity.js';

export class UserMapper {
  static toResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    }
  }
}
