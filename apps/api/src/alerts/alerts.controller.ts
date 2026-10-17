import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';

import { Auth } from '../auth/decorators/auth.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UserResponseDto } from '../users/dto/user-response.dto.js';
import { AlertsQueryDto } from './dto/alerts-query.dto.js';
import { AlertListResponseDto } from './dto/alert-response.dto.js';
import { AlertsService } from './alerts.service.js';

@Controller('alerts')
@Auth()
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  findAll(@CurrentUser() user: UserResponseDto, @Query() query: AlertsQueryDto): Promise<AlertListResponseDto> {
    return this.alertsService.findAll(user.id, query);
  }

  @Get('unread-count')
  countUnread(@CurrentUser() user: UserResponseDto): Promise<{ count: number }> {
    return this.alertsService.countUnread(user.id);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  markAllAsRead(@CurrentUser() user: UserResponseDto): Promise<void> {
    return this.alertsService.markAllAsRead(user.id);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markAsRead(@CurrentUser() user: UserResponseDto, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.alertsService.markAsRead(user.id, id);
  }
}
