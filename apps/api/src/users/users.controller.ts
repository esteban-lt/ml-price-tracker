import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Patch, Post, Query } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { Auth } from '../auth/decorators/auth.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UpdateEmailNotificationsDto } from './dto/update-email-notifications.dto.js';
import { UserResponseDto } from './dto/user-response.dto.js';
import { UnsubscribeDto } from './dto/unsubscribe.dto.js';
import { EmailUnsubscribeTokenService } from './email-unsubscribe-token.service.js';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly emailUnsubscribeTokenService: EmailUnsubscribeTokenService,
  ) {}

  @Patch('me/email-notifications')
  @Auth()
  updateEmailNotifications(
    @CurrentUser() user: UserResponseDto,
    @Body() { enabled }: UpdateEmailNotificationsDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateEmailNotifications(user.id, enabled);
  }

  @Post('unsubscribe')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unsubscribe(@Query() { token }: UnsubscribeDto): Promise<void> {
    const userId = this.emailUnsubscribeTokenService.verify(token);
    if (!userId) throw new BadRequestException('El enlace para dejar de recibir correos no es válido');
    await this.usersService.disableEmailNotifications(userId);
  }
}
