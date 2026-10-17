import { AlertResponseDto } from '../dto/alert-response.dto.js';
import { Alert } from '../entities/alert.entity.js';

export class AlertMapper {
  // Requiere cargadas las relaciones priceHistory y trackedProduct.product.
  static toResponse({ id, createdAt, readAt, priceHistory, trackedProduct }: Alert): AlertResponseDto {
    const { product } = trackedProduct;

    return {
      id,
      createdAt,
      readAt,
      price: priceHistory.price,
      originalPrice: priceHistory.originalPrice,
      currency: priceHistory.currency,
      thresholdType: trackedProduct.thresholdType,
      thresholdValue: trackedProduct.thresholdValue,
      product: {
        id: product.id,
        name: product.name,
        url: product.url,
        imageUrl: product.imageUrl,
      },
    };
  }
}
