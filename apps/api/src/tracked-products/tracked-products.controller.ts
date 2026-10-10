import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  SerializeOptions,
  UseInterceptors,
} from '@nestjs/common';

import { Auth } from '../auth/decorators/auth.decorator.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { UserResponseDto } from '../users/dto/user-response.dto.js';
import { TrackProductDto } from './dto/track-product.dto.js';
import { TrackedProductResponseDto } from './dto/tracked-product-response.dto.js';
import { UpdateThresholdDto } from './dto/update-threshold.dto.js';
import { TrackedProduct, TrackingStatusEnum } from './entities/tracked-product.entity.js';
import { TrackedProductsService } from './tracked-products.service.js';

@Controller('tracked-products')
@Auth()
@UseInterceptors(ClassSerializerInterceptor)
@SerializeOptions({ type: TrackedProductResponseDto })
export class TrackedProductsController {
  constructor(private readonly trackedProductsService: TrackedProductsService) {}

  @Post()
  track(@CurrentUser() user: UserResponseDto, @Body() trackProductDto: TrackProductDto): Promise<TrackedProduct> {
    return this.trackedProductsService.track(user.id, trackProductDto);
  }

  @Get()
  findAll(@CurrentUser() user: UserResponseDto): Promise<TrackedProduct[]> {
    return this.trackedProductsService.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: UserResponseDto, @Param('id', ParseUUIDPipe) id: string): Promise<TrackedProduct> {
    return this.trackedProductsService.findOne(user.id, id);
  }

  @Patch(':id')
  updateThreshold(
    @CurrentUser() user: UserResponseDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateThresholdDto: UpdateThresholdDto,
  ): Promise<TrackedProduct> {
    return this.trackedProductsService.updateThreshold(user.id, id, updateThresholdDto);
  }

  @Patch(':id/pause')
  pause(@CurrentUser() user: UserResponseDto, @Param('id', ParseUUIDPipe) id: string): Promise<TrackedProduct> {
    return this.trackedProductsService.updateStatus(user.id, id, TrackingStatusEnum.PAUSED);
  }

  @Patch(':id/resume')
  resume(@CurrentUser() user: UserResponseDto, @Param('id', ParseUUIDPipe) id: string): Promise<TrackedProduct> {
    return this.trackedProductsService.updateStatus(user.id, id, TrackingStatusEnum.ACTIVE);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: UserResponseDto, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.trackedProductsService.remove(user.id, id);
  }
}
