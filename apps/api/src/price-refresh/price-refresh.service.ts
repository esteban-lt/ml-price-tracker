import { Injectable, Logger } from '@nestjs/common';

import { AlertDetectionService } from '../alerts/alert-detection.service.js';
import { mapWithConcurrency } from '../mercado-libre/api/mercado-libre-api.service.js';
import { MercadoLibreUnavailableException } from '../mercado-libre/mercado-libre-circuit-breaker.js';
import { PriceHistory } from '../price-history/entities/price-history.entity.js';
import { ProductsService, RefreshResult } from '../products/products.service.js';
import { TrackedProductsService } from '../tracked-products/tracked-products.service.js';

// Se omiten los productos con un snapshot más reciente que esto (p. ej. el que se crea al agregarlos).
const MIN_SNAPSHOT_AGE_MS = 30 * 60 * 1000;
const MAX_FAILED_IDS_IN_SUMMARY = 10;

@Injectable()
export class PriceRefreshService {
  private readonly logger = new Logger(PriceRefreshService.name);
  private isRunning = false;

  constructor(
    private readonly trackedProductsService: TrackedProductsService,
    private readonly productsService: ProductsService,
    private readonly alertDetectionService: AlertDetectionService,
  ) {}

  async run(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('La corrida anterior sigue en curso; se omite esta');
      return;
    }

    this.isRunning = true;
    try {
      await this.refreshAll();
    } catch (error) {
      this.logger.error(`La corrida falló: ${(error as Error).message}`);
    } finally {
      this.isRunning = false;
    }
  }

  private async refreshAll(): Promise<void> {
    const startedAt = Date.now();
    const products = await this.trackedProductsService.findProductsToRefresh(
      new Date(startedAt - MIN_SNAPSHOT_AGE_MS),
    );

    let alertsCreated = 0;
    const failedIds: string[] = [];
    const outcomes = await mapWithConcurrency(products, async (product) => {
      let result: RefreshResult;
      try {
        result = await this.productsService.refreshPrice(product);
      } catch (error) {
        if (error instanceof MercadoLibreUnavailableException) return 'skipped' as const;
        failedIds.push(product.externalId);
        this.logger.warn(
          `No se pudo revisar el producto ${product.id} (${product.externalId}): ${(error as Error).message}`,
        );
        return 'failed' as const;
      }

      if (result.outcome === 'updated') alertsCreated += await this.detectAlerts(result.snapshot);
      return result.outcome;
    });

    const count = (outcome: string) => outcomes.filter((result) => result === outcome).length;
    const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    const failedDetail = failedIds.length > 0 ? ` (${summarizeIds(failedIds)})` : '';
    this.logger.log(
      `Corrida terminada en ${seconds}s: ${products.length} revisados, ${count('updated')} actualizados, ` +
        `${count('unavailable')} sin disponibilidad, ${count('failed')} fallidos${failedDetail}, ` +
        `${count('skipped')} omitidos porque Mercado Libre no estaba disponible, ${alertsCreated} alertas creadas`,
    );
  }

  // Un fallo al evaluar alertas no debe detener la revisión de los demás productos.
  private async detectAlerts(snapshot: PriceHistory): Promise<number> {
    try {
      return await this.alertDetectionService.detectForSnapshot(snapshot);
    } catch (error) {
      this.logger.error(`No se pudieron evaluar las alertas del producto ${snapshot.productId}: ${(error as Error).message}`);
      return 0;
    }
  }
}

function summarizeIds(ids: string[]): string {
  const shown = ids.slice(0, MAX_FAILED_IDS_IN_SUMMARY).join(', ');
  return ids.length > MAX_FAILED_IDS_IN_SUMMARY ? `${shown} y ${ids.length - MAX_FAILED_IDS_IN_SUMMARY} más` : shown;
}
