import { IsNull, Repository } from 'typeorm';

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { AlertsQueryDto } from './dto/alerts-query.dto.js';
import { AlertListResponseDto } from './dto/alert-response.dto.js';
import { Alert } from './entities/alert.entity.js';
import { AlertMapper } from './mappers/alert.mapper.js';

// Bandeja de alertas: todas las operaciones se limitan a los seguimientos del usuario.
@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(Alert)
    private readonly alertRepository: Repository<Alert>,
  ) {}

  async findAll(userId: string, { page, limit, unread }: AlertsQueryDto): Promise<AlertListResponseDto> {
    const [alerts, total] = await this.alertRepository.findAndCount({
      where: { trackedProduct: { userId }, ...(unread && { readAt: IsNull() }) },
      relations: { priceHistory: true, trackedProduct: { product: true } },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items: alerts.map(AlertMapper.toResponse), total, page, limit };
  }

  async countUnread(userId: string): Promise<{ count: number }> {
    const count = await this.alertRepository.countBy({ trackedProduct: { userId }, readAt: IsNull() });
    return { count };
  }

  async markAsRead(userId: string, id: string): Promise<void> {
    const exists = await this.alertRepository.existsBy({ id, trackedProduct: { userId } });
    if (!exists) throw new NotFoundException(`La alerta ${id} no existe`);

    await this.alertRepository.update({ id, readAt: IsNull() }, { readAt: () => 'now()' });
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.alertRepository
      .createQueryBuilder()
      .update()
      .set({ readAt: () => 'now()' })
      .where('read_at IS NULL')
      .andWhere('tracked_product_id IN (SELECT id FROM tracked_products WHERE user_id = :userId)', { userId })
      .execute();
  }
}
