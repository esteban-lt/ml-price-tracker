import { DataSource, EntityManager, QueryFailedError, Repository } from 'typeorm';

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { PriceHistory } from '../price-history/entities/price-history.entity.js';
import { PriceHistoryService } from '../price-history/price-history.service.js';
import { AddProductDto } from './dto/add-product.dto.js';
import { Product } from './entities/product.entity.js';
import { ExternalProductData } from './interfaces/external-product-data.js';
import { ProviderRegistry } from './providers/provider-registry.js';

const POSTGRES_UNIQUE_VIOLATION = '23505';

export type RefreshOutcome = 'updated' | 'unavailable';

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

        await this.saveSnapshot(savedProduct.id, productData, manager);

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

  // Revisa el precio de un producto ya guardado. Un NotFound del provider significa que el producto ya
  // no tiene vendedores o precio (se marca no disponible y no se guarda snapshot); cualquier otro error
  // (límite de peticiones, caída, timeout) es transitorio: se propaga sin tocar la disponibilidad.
  async refreshPrice(product: Product): Promise<RefreshOutcome> {
    const provider = this.providerRegistry.getProviderForStore(product.store);

    let productData: ExternalProductData;
    try {
      productData = await provider.fetchProductData(product.externalId);
    } catch (error) {
      if (!(error instanceof NotFoundException)) throw error;

      if (product.isAvailable) await this.productRepository.update(product.id, { isAvailable: false });
      return 'unavailable';
    }

    await this.dataSource.transaction(async (manager) => {
      await this.saveSnapshot(product.id, productData, manager);
      if (!product.isAvailable) await manager.getRepository(Product).update(product.id, { isAvailable: true });
    });
    return 'updated';
  }

  findAll(): Promise<Product[]> {
    return this.productRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: string): Promise<Product> {
    const product = await this.productRepository.findOneBy({ id });
    if (!product) throw new NotFoundException(`El producto ${id} no existe`);
    return product;
  }

  // Único punto donde se guarda un snapshot de precio al agregar o revisar un producto; las alertas se enganchan aquí.
  private saveSnapshot(productId: string, data: ExternalProductData, manager: EntityManager): Promise<PriceHistory> {
    return this.priceHistoryService.recordSnapshot(
      {
        productId,
        price: data.price,
        originalPrice: data.originalPrice,
        sellersCount: data.sellersCount,
        currency: data.currency,
      },
      manager,
    );
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string }).code === POSTGRES_UNIQUE_VIOLATION
  );
}
