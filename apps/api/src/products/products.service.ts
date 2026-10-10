import { DataSource, QueryFailedError, Repository } from 'typeorm';

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { PriceHistoryService } from '../price-history/price-history.service.js';
import { AddProductDto } from './dto/add-product.dto.js';
import { Product } from './entities/product.entity.js';
import { ProviderRegistry } from './providers/provider-registry.js';

const POSTGRES_UNIQUE_VIOLATION = '23505';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    private readonly providerRegistry: ProviderRegistry,
    private readonly priceHistoryService: PriceHistoryService,
    private readonly dataSource: DataSource,
  ) {}

  async addProduct({ store, externalId }: AddProductDto): Promise<Product> {
    const provider = this.providerRegistry.getProviderForStore(store);
    const productData = await provider.fetchProductData(externalId);

    const existingProduct = await this.productRepository.findOneBy({
      store,
      externalId: productData.externalId,
    });
    if (existingProduct) return existingProduct;

    const product = this.productRepository.create({
      store,
      externalId: productData.externalId,
      name: productData.name,
      url: productData.url,
      imageUrl: productData.imageUrl,
    });

    try {
      // El producto y su primer snapshot se guardan juntos: si uno falla, no queda ninguno.
      return await this.dataSource.transaction(async (manager) => {
        const savedProduct = await manager.getRepository(Product).save(product);

        await this.priceHistoryService.recordSnapshot(
          {
            productId: savedProduct.id,
            price: productData.price,
            originalPrice: productData.originalPrice,
            sellersCount: productData.sellersCount,
            currency: productData.currency,
          },
          manager,
        );

        return savedProduct;
      });
    } catch (error) {
      // Otra petición pudo guardar el mismo producto entre la búsqueda y el insert.
      if (isUniqueViolation(error)) {
        return this.productRepository.findOneByOrFail({ store, externalId: productData.externalId });
      }
      throw error;
    }
  }

  findAll(): Promise<Product[]> {
    return this.productRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<Product> {
    const product = await this.productRepository.findOneBy({ id });
    if (!product) throw new NotFoundException(`El producto ${id} no existe`);
    return product;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string }).code === POSTGRES_UNIQUE_VIOLATION
  );
}
