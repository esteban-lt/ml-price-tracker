import { And, LessThan, MoreThan, Repository } from 'typeorm';

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { PriceHistory } from '../price-history/entities/price-history.entity.js';
import {
  ThresholdTypeEnum,
  TrackedProduct,
  TrackingStatusEnum,
} from '../tracked-products/entities/tracked-product.entity.js';
import { Alert } from './entities/alert.entity.js';

@Injectable()
export class AlertDetectionService {
  private readonly logger = new Logger(AlertDetectionService.name);

  constructor(
    @InjectRepository(Alert)
    private readonly alertRepository: Repository<Alert>,

    @InjectRepository(TrackedProduct)
    private readonly trackedProductRepository: Repository<TrackedProduct>,

    @InjectRepository(PriceHistory)
    private readonly priceHistoryRepository: Repository<PriceHistory>,
  ) {}

  // Crea una alerta por cada seguimiento activo cuyo umbral cruzó el snapshot. Devuelve cuántas creó.
  async detectForSnapshot(snapshot: PriceHistory): Promise<number> {
    const trackedProducts = await this.trackedProductRepository.findBy({
      productId: snapshot.productId,
      status: TrackingStatusEnum.ACTIVE,
    });

    let created = 0;
    for (const trackedProduct of trackedProducts) {
      try {
        if (await this.crossedThreshold(trackedProduct, snapshot)) {
          created += await this.createAlert(trackedProduct.id, snapshot.id);
        }
      } catch (error) {
        this.logger.error(
          `No se pudo evaluar la alerta del seguimiento ${trackedProduct.id}: ${(error as Error).message}`,
        );
      }
    }
    return created;
  }

  // Solo hay cruce si el precio nuevo cumple la condición y el anterior no la cumplía.
  private async crossedThreshold(trackedProduct: TrackedProduct, snapshot: PriceHistory): Promise<boolean> {
    const targetPrice = getTargetPrice(trackedProduct);
    if (targetPrice === null || snapshot.price > targetPrice) return false;

    const previousPrice = (await this.findPreviousPrice(trackedProduct, snapshot)) ?? trackedProduct.referencePrice;
    return previousPrice === null || previousPrice > targetPrice;
  }

  private async findPreviousPrice(trackedProduct: TrackedProduct, snapshot: PriceHistory): Promise<number | null> {
    const previous = await this.priceHistoryRepository.findOne({
      where: {
        productId: snapshot.productId,
        checkedAt: And(MoreThan(trackedProduct.createdAt), LessThan(snapshot.checkedAt)),
      },
      order: { checkedAt: 'DESC' },
    });
    return previous?.price ?? null;
  }

  // El índice único (seguimiento, snapshot) hace que un duplicado se ignore en lugar de fallar.
  private async createAlert(trackedProductId: string, priceHistoryId: string): Promise<number> {
    const result = await this.alertRepository
      .createQueryBuilder()
      .insert()
      .values({ trackedProductId, priceHistoryId })
      .orIgnore()
      .execute();
    return (result.raw as unknown[]).length;
  }
}

// Precio máximo que dispara la alerta; null si no se puede calcular (porcentaje sin precio de referencia).
function getTargetPrice({ thresholdType, thresholdValue, referencePrice }: TrackedProduct): number | null {
  if (thresholdType === ThresholdTypeEnum.PRICE_BELOW) return thresholdValue;
  if (referencePrice === null) return null;
  return Math.round(referencePrice * (1 - thresholdValue / 100) * 100) / 100;
}
