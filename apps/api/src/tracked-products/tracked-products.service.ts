import { QueryFailedError, Repository } from 'typeorm';

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { PriceHistory } from '../price-history/entities/price-history.entity.js';
import { PriceHistoryService } from '../price-history/price-history.service.js';
import { Product } from '../products/entities/product.entity.js';
import { ProductsService } from '../products/products.service.js';
import { TrackProductDto } from './dto/track-product.dto.js';
import { UpdateThresholdDto } from './dto/update-threshold.dto.js';
import { TrackedProduct, TrackingStatusEnum } from './entities/tracked-product.entity.js';

const POSTGRES_UNIQUE_VIOLATION = '23505';

@Injectable()
export class TrackedProductsService {
  constructor(
    @InjectRepository(TrackedProduct)
    private readonly trackedProductRepository: Repository<TrackedProduct>,

    private readonly productsService: ProductsService,
    private readonly priceHistoryService: PriceHistoryService,
  ) {}

  async track(
    userId: string,
    { store, externalId, thresholdType, thresholdValue }: TrackProductDto,
  ): Promise<TrackedProduct> {
    const product = await this.productsService.addProduct({ store, externalId });
    const latestSnapshot = await this.priceHistoryService.findLatest(product.id);

    const trackedProduct = this.trackedProductRepository.create({
      userId,
      productId: product.id,
      product,
      thresholdType,
      thresholdValue,
      referencePrice: latestSnapshot?.price ?? null,
    });

    try {
      return await this.trackedProductRepository.save(trackedProduct);
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException('Ya sigues este producto');
      throw error;
    }
  }

  findAll(userId: string): Promise<TrackedProduct[]> {
    return this.trackedProductRepository.find({
      where: { userId },
      relations: { product: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(userId: string, id: string): Promise<TrackedProduct> {
    const trackedProduct = await this.trackedProductRepository.findOne({
      where: { id, userId },
      relations: { product: true },
    });
    if (!trackedProduct) throw new NotFoundException(`El seguimiento ${id} no existe`);
    return trackedProduct;
  }

  async updateThreshold(
    userId: string,
    id: string,
    { thresholdType, thresholdValue }: UpdateThresholdDto,
  ): Promise<TrackedProduct> {
    const trackedProduct = await this.findOne(userId, id);
    trackedProduct.thresholdType = thresholdType;
    trackedProduct.thresholdValue = thresholdValue;
    return this.trackedProductRepository.save(trackedProduct);
  }

  async updateStatus(userId: string, id: string, status: TrackingStatusEnum): Promise<TrackedProduct> {
    const trackedProduct = await this.findOne(userId, id);
    trackedProduct.status = status;
    return this.trackedProductRepository.save(trackedProduct);
  }

  // Productos con al menos un seguimiento activo (sin repetir) y sin snapshot posterior a `checkedBefore`.
  findProductsToRefresh(checkedBefore: Date): Promise<Product[]> {
    return this.trackedProductRepository.manager
      .createQueryBuilder(Product, 'product')
      .where((qb) => {
        const activeTracking = qb
          .subQuery()
          .select('1')
          .from(TrackedProduct, 'tracked')
          .where('tracked.product_id = product.id')
          .andWhere('tracked.status = :status', { status: TrackingStatusEnum.ACTIVE })
          .getQuery();
        return `EXISTS ${activeTracking}`;
      })
      .andWhere((qb) => {
        const recentSnapshot = qb
          .subQuery()
          .select('1')
          .from(PriceHistory, 'snapshot')
          .where('snapshot.product_id = product.id')
          .andWhere('snapshot.checked_at > :checkedBefore', { checkedBefore })
          .getQuery();
        return `NOT EXISTS ${recentSnapshot}`;
      })
      .getMany();
  }

  async remove(userId: string, id: string): Promise<void> {
    const { affected } = await this.trackedProductRepository.delete({ id, userId });
    if (!affected) throw new NotFoundException(`El seguimiento ${id} no existe`);
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string }).code === POSTGRES_UNIQUE_VIOLATION
  );
}
