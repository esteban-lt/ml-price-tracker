import { Exclude, Expose, Type } from 'class-transformer';

import { ProductResponseDto } from '../../products/dto/product-response.dto.js';
import { ThresholdTypeEnum, TrackingStatusEnum } from '../entities/tracked-product.entity.js';

@Exclude()
export class TrackedProductResponseDto {
  @Expose() id: string;
  @Expose() @Type(() => ProductResponseDto) product: ProductResponseDto;
  @Expose() thresholdType: ThresholdTypeEnum;
  @Expose() thresholdValue: number;
  @Expose() referencePrice: number | null;
  @Expose() status: TrackingStatusEnum;
  @Expose() createdAt: Date;
}
