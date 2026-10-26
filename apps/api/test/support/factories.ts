import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';

import { Alert } from '../../src/alerts/entities/alert.entity.js';
import { PriceHistory } from '../../src/price-history/entities/price-history.entity.js';
import { Product, StoreEnum } from '../../src/products/entities/product.entity.js';
import {
  ThresholdTypeEnum,
  TrackedProduct,
  TrackingStatusEnum,
} from '../../src/tracked-products/entities/tracked-product.entity.js';
import { User } from '../../src/users/entities/user.entity.js';

const MINUTE_MS = 60_000;

// Fecha `minutes` minutos antes de ahora; útil para ordenar seguimientos y snapshots sin esperar.
export const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * MINUTE_MS);

export async function createUser(
  dataSource: DataSource,
  { email = `user-${randomUUID().slice(0, 8)}@example.test`, verified = true, emailNotifications = true } = {},
): Promise<User> {
  return dataSource.getRepository(User).save({
    name: 'Usuario de prueba',
    email,
    password: 'not-a-real-hash',
    emailVerifiedAt: verified ? new Date() : null,
    emailNotifications,
  });
}

export async function createProduct(
  dataSource: DataSource,
  { externalId = `MLM${Math.floor(Math.random() * 1e8)}`, name = 'Producto de prueba', isAvailable = true } = {},
): Promise<Product> {
  return dataSource.getRepository(Product).save({
    store: StoreEnum.MERCADO_LIBRE,
    externalId,
    name,
    url: `https://www.mercadolibre.com.mx/p/${externalId}`,
    imageUrl: null,
    isAvailable,
  });
}

export async function createSnapshot(
  dataSource: DataSource,
  product: Product,
  price: number,
  checkedAt: Date = new Date(),
): Promise<PriceHistory> {
  const repository = dataSource.getRepository(PriceHistory);
  const snapshot = await repository.save({
    productId: product.id,
    price,
    originalPrice: null,
    sellersCount: 1,
    currency: 'MXN',
  });
  await setCreatedAt(dataSource, 'price_history', snapshot.id, checkedAt, 'checked_at');
  return repository.findOneByOrFail({ id: snapshot.id });
}

export async function createTracking(
  dataSource: DataSource,
  {
    user,
    product,
    thresholdType = ThresholdTypeEnum.PRICE_BELOW,
    thresholdValue = 900,
    referencePrice = 1000,
    status = TrackingStatusEnum.ACTIVE,
    createdAt = new Date(),
  }: {
    user: User;
    product: Product;
    thresholdType?: ThresholdTypeEnum;
    thresholdValue?: number;
    referencePrice?: number | null;
    status?: TrackingStatusEnum;
    createdAt?: Date;
  },
): Promise<TrackedProduct> {
  const repository = dataSource.getRepository(TrackedProduct);
  const tracking = await repository.save({
    userId: user.id,
    productId: product.id,
    thresholdType,
    thresholdValue,
    referencePrice,
    status,
  });
  await setCreatedAt(dataSource, 'tracked_products', tracking.id, createdAt);
  return repository.findOneByOrFail({ id: tracking.id });
}

export async function createAlert(
  dataSource: DataSource,
  {
    tracking,
    snapshot,
    createdAt = new Date(),
    readAt = null,
  }: { tracking: TrackedProduct; snapshot: PriceHistory; createdAt?: Date; readAt?: Date | null },
): Promise<Alert> {
  const repository = dataSource.getRepository(Alert);
  const alert = await repository.save({ trackedProductId: tracking.id, priceHistoryId: snapshot.id, readAt });
  await setCreatedAt(dataSource, 'alerts', alert.id, createdAt);
  return repository.findOneByOrFail({ id: alert.id });
}

// Las columnas de creación usan DEFAULT now(); se fijan después para controlar el orden en el tiempo.
async function setCreatedAt(
  dataSource: DataSource,
  table: string,
  id: string,
  date: Date,
  column = 'created_at',
): Promise<void> {
  await dataSource.query(`UPDATE "${table}" SET "${column}" = $1 WHERE id = $2`, [date, id]);
}
