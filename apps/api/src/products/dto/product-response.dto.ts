import { Exclude, Expose } from 'class-transformer';
import { StoreEnum } from '../entities/product.entity.js';

@Exclude()
export class ProductResponseDto {
  @Expose() id: string;
  @Expose() store: StoreEnum;
  @Expose() name: string;
  @Expose() url: string;
  @Expose() imageUrl: string;
  @Expose() createdAt: Date;
}
