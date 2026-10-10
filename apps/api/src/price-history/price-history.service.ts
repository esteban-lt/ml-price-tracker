import { EntityManager, MoreThanOrEqual, Repository } from 'typeorm';

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { Product } from '../products/entities/product.entity.js';
import { PriceHistory } from './entities/price-history.entity.js';
import { PriceSnapshotData } from './interfaces/price-snapshot-data.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class PriceHistoryService {
  constructor(
    @InjectRepository(PriceHistory)
    private readonly priceHistoryRepository: Repository<PriceHistory>,

    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  recordSnapshot(data: PriceSnapshotData, manager?: EntityManager): Promise<PriceHistory> {
    const repository = manager ? manager.getRepository(PriceHistory) : this.priceHistoryRepository;

    return repository.save(repository.create(data));
  }

  async findHistory(productId: string, days: number): Promise<PriceHistory[]> {
    const productExists = await this.productRepository.existsBy({ id: productId });
    if (!productExists) throw new NotFoundException(`El producto ${productId} no existe`);

    const since = new Date(Date.now() - days * DAY_IN_MS);

    return this.priceHistoryRepository.find({
      where: { productId, checkedAt: MoreThanOrEqual(since) },
      order: { checkedAt: 'ASC' },
    });
  }

  findLatest(productId: string): Promise<PriceHistory | null> {
    return this.priceHistoryRepository.findOne({
      where: { productId },
      order: { checkedAt: 'DESC' },
    });
  }
}
