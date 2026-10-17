import { ThresholdTypeEnum } from '../../tracked-products/entities/tracked-product.entity.js';

export class AlertProductDto {
  id: string;
  name: string;
  url: string;
  imageUrl: string | null;
}

export class AlertResponseDto {
  id: string;
  createdAt: Date;
  readAt: Date | null;
  price: number;
  originalPrice: number | null;
  currency: string;
  thresholdType: ThresholdTypeEnum;
  thresholdValue: number;
  product: AlertProductDto;
}

export class AlertListResponseDto {
  items: AlertResponseDto[];
  total: number;
  page: number;
  limit: number;
}
