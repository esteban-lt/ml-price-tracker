import { Injectable } from '@nestjs/common';

import { StoreEnum } from '../entities/product.entity.js';
import { ExternalProduct } from '../interfaces/external-product.js';
import { ProductProvider } from '../interfaces/product-provider.js';

@Injectable()
export class MercadoLibreProvider implements ProductProvider {
  readonly store = StoreEnum.MERCADO_LIBRE;

  supports(url: string): boolean {
    return new URL(url).hostname.includes('mercadolibre.com');
  }

  getProductDataByUrl(url: string): Promise<ExternalProduct> {
    throw new Error('Method not implemented.');
  }
}