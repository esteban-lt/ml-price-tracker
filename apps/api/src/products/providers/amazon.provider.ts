import { Injectable } from '@nestjs/common';

import { StoreEnum } from '../entities/product.entity.js';
import { ExternalProduct } from '../interfaces/external-product.js';
import { ProductProvider } from '../interfaces/product-provider.js';

@Injectable()
export class AmazonProvider implements ProductProvider {
  readonly store = StoreEnum.AMAZON;

  supports(url: string): boolean {
    return new URL(url).hostname.includes('amazon.');
  }

  getProductDataByUrl(url: string): Promise<ExternalProduct> {
    throw new Error('Method not implemented.');
  }
}
