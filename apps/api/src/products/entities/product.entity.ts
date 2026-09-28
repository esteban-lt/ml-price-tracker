import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum StoreEnum {
  MERCADO_LIBRE = 'mercado_libre',
  AMAZON = 'amazon',
}

@Entity('products')
@Index(['store', 'externalId'], { unique: true })
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: StoreEnum })
  store: StoreEnum;

  @Column({ name: 'external_id', type: 'varchar' })
  externalId: string;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  url: string;

  @Column({ name: 'image_url', type: 'varchar', nullable: true })
  imageUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
