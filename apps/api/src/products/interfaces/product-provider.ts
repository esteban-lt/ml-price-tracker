import { StoreEnum } from '../entities/product.entity.js';
import { ExternalProduct } from './external-product.js';

export interface ProductProvider {
  readonly store: StoreEnum;
  supports(url: string): boolean;
  getProductDataByUrl(url: string): Promise<ExternalProduct>
}