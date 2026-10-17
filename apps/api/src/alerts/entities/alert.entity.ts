import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { PriceHistory } from '../../price-history/entities/price-history.entity.js';
import { TrackedProduct } from '../../tracked-products/entities/tracked-product.entity.js';

export enum AlertStatusEnum {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

@Entity('alerts')
@Index(['trackedProductId', 'priceHistoryId'], { unique: true })
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tracked_product_id', type: 'uuid' })
  trackedProductId: string;

  @ManyToOne(() => TrackedProduct, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tracked_product_id' })
  trackedProduct: TrackedProduct;

  @Column({ name: 'price_history_id', type: 'uuid' })
  priceHistoryId: string;

  @ManyToOne(() => PriceHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'price_history_id' })
  priceHistory: PriceHistory;

  @Column({
    type: 'enum',
    enum: AlertStatusEnum,
    enumName: 'alert_status_enum',
    default: AlertStatusEnum.PENDING,
  })
  status: AlertStatusEnum;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
