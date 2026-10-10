import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  ValueTransformer,
} from 'typeorm';

import { Product } from '../../products/entities/product.entity.js';
import { User } from '../../users/entities/user.entity.js';

export enum ThresholdTypeEnum {
  PRICE_BELOW = 'price_below',
  PERCENTAGE_DROP = 'percentage_drop',
}

export enum TrackingStatusEnum {
  ACTIVE = 'active',
  PAUSED = 'paused',
}

const decimalToNumber: ValueTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

@Entity('tracked_products')
@Index(['userId', 'productId'], { unique: true })
export class TrackedProduct {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({
    name: 'threshold_type',
    type: 'enum',
    enum: ThresholdTypeEnum,
    enumName: 'threshold_type_enum',
    default: ThresholdTypeEnum.PRICE_BELOW,
  })
  thresholdType: ThresholdTypeEnum;

  @Column({
    name: 'threshold_value',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: decimalToNumber,
  })
  thresholdValue: number;

  @Column({
    name: 'reference_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimalToNumber,
  })
  referencePrice: number | null;

  @Column({
    type: 'enum',
    enum: TrackingStatusEnum,
    enumName: 'tracking_status_enum',
    default: TrackingStatusEnum.ACTIVE,
  })
  status: TrackingStatusEnum;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
