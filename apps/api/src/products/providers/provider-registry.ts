import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ProductProvider } from '../interfaces/product-provider.js';

export const PRODUCT_PROVIDERS = 'PRODUCT_PROVIDERS';

@Injectable()
export class ProviderRegistry {
  constructor(
    @Inject(PRODUCT_PROVIDERS)
    private readonly providers: ProductProvider[],
  ) {}

  getProvider(url: string): ProductProvider {
    const provider = this.providers.find((provider) => provider.supports(url));
    if(!provider) throw new BadRequestException('Unsupported URL');
    return provider;
  }
}
