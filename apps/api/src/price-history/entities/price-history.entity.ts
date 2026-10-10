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

// Postgres devuelve las columnas decimal como string para no perder precisión; la app trabaja con números.
const decimalToNumber: ValueTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};

@Entity('price_history')
@Index(['productId', 'checkedAt'])
export class PriceHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'decimal', precision: 10, scale: 2, transformer: decimalToNumber })
  price: number;

  @Column({
    name: 'original_price',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimalToNumber,
  })
  originalPrice: number | null;

  @Column({ name: 'sellers_count', type: 'int', nullable: true })
  sellersCount: number | null;

  @Column({ type: 'varchar', length: 3, default: 'MXN' })
  currency: string;

  @CreateDateColumn({ name: 'checked_at' })
  checkedAt: Date;
}
