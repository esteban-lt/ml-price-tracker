import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  SerializeOptions,
  UseInterceptors,
} from '@nestjs/common';

import { Auth } from '../auth/decorators/auth.decorator.js';
import { PriceHistoryQueryDto } from './dto/price-history-query.dto.js';
import { PriceHistoryResponseDto } from './dto/price-history-response.dto.js';
import { PriceHistory } from './entities/price-history.entity.js';
import { PriceHistoryService } from './price-history.service.js';

@Controller('products/:productId/price-history')
@Auth()
@UseInterceptors(ClassSerializerInterceptor)
@SerializeOptions({ type: PriceHistoryResponseDto })
export class PriceHistoryController {
  constructor(private readonly priceHistoryService: PriceHistoryService) {}

  @Get()
  findHistory(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query() { days }: PriceHistoryQueryDto,
  ): Promise<PriceHistory[]> {
    return this.priceHistoryService.findHistory(productId, days);
  }
}
