import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import { StoreEnum } from '../entities/product.entity.js';
import { ProductProvider } from '../interfaces/product-provider.js';

export const PRODUCT_PROVIDERS = 'PRODUCT_PROVIDERS';

@Injectable()
export class ProviderRegistry {
  constructor(
    @Inject(PRODUCT_PROVIDERS)
    private readonly providers: ProductProvider[],
  ) {}

  getProviderForStore(store: StoreEnum): ProductProvider {
    const provider = this.providers.find((provider) => provider.store === store);
    if (!provider) throw new BadRequestException(`La tienda "${store}" no está soportada`);
    return provider;
  }
}
