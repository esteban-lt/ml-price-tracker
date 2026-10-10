import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class PriceHistoryResponseDto {
  @Expose() id: string;
  @Expose() price: number;
  @Expose() originalPrice: number | null;
  @Expose() sellersCount: number | null;
  @Expose() currency: string;
  @Expose() checkedAt: Date;
}
