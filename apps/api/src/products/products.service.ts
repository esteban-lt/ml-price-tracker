import { Repository } from 'typeorm';

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { ProviderRegistry } from './providers/provider-registry.js';
import { Product } from './entities/product.entity.js';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    private readonly providerRegistry: ProviderRegistry,
  ) {}

  async addByUrl(url: string): Promise<Product> {
    const provider = this.providerRegistry.getProvider(url);
    const data = await provider.getProductDataByUrl(url);

    const existingProduct = await this.productRepository.findOne({
      where: {
        store: provider.store,
        externalId: data.externalId,
      },
    });

    if(existingProduct) return existingProduct;

    const product = this.productRepository.create({
      store: provider.store,
      externalId: data.externalId,
      name: data.name,
      url: data.permaLink,
      imageUrl: data.imageUrl,
    });

    return this.productRepository.save(product);
  }
}
