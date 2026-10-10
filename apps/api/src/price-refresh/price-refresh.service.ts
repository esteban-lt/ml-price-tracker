import { Injectable, Logger } from '@nestjs/common';

import { mapWithConcurrency } from '../mercado-libre/api/mercado-libre-api.service.js';
import { ProductsService } from '../products/products.service.js';
import { TrackedProductsService } from '../tracked-products/tracked-products.service.js';

// Se omiten los productos con un snapshot más reciente que esto (p. ej. el que se crea al agregarlos).
const MIN_SNAPSHOT_AGE_MS = 30 * 60 * 1000;

@Injectable()
export class PriceRefreshService {
  private readonly logger = new Logger(PriceRefreshService.name);
  private isRunning = false;

  constructor(
    private readonly trackedProductsService: TrackedProductsService,
    private readonly productsService: ProductsService,
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

    const outcomes = await mapWithConcurrency(products, async (product) => {
      try {
        return await this.productsService.refreshPrice(product);
      } catch (error) {
        this.logger.warn(
          `No se pudo revisar el producto ${product.id} (${product.externalId}): ${(error as Error).message}`,
        );
        return 'failed' as const;
      }
    });

    const count = (outcome: string) => outcomes.filter((result) => result === outcome).length;
    const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    this.logger.log(
      `Corrida terminada en ${seconds}s: ${products.length} revisados, ${count('updated')} actualizados, ` +
        `${count('unavailable')} sin disponibilidad, ${count('failed')} fallidos`,
    );
  }
}
