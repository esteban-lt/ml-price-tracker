import { Body, Controller, Patch } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { Auth } from '../auth/decorators/auth.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UpdateEmailNotificationsDto } from './dto/update-email-notifications.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me/email-notifications')
  @Auth()
  updateEmailNotifications(
    @CurrentUser() user: UserResponseDto,
    @Body() { enabled }: UpdateEmailNotificationsDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateEmailNotifications(user.id, enabled);
  }
}
