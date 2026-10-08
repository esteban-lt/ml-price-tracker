import { StoreEnum } from '../entities/product.entity.js';
import { ExternalProductData } from './external-product-data.js';

export interface ProductProvider {
  readonly store: StoreEnum;
  fetchProductData(externalId: string): Promise<ExternalProductData>;
}
