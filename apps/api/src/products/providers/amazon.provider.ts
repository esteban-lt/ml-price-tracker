import { Injectable, NotImplementedException } from '@nestjs/common';

import { StoreEnum } from '../entities/product.entity.js';
import { ExternalProductData } from '../interfaces/external-product-data.js';
import { ProductProvider } from '../interfaces/product-provider.js';

@Injectable()
export class AmazonProvider implements ProductProvider {
  readonly store = StoreEnum.AMAZON;

  fetchProductData(): Promise<ExternalProductData> {
    throw new NotImplementedException('La integración con Amazon todavía no está disponible');
  }
}
