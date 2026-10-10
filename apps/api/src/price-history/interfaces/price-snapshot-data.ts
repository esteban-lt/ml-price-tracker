export interface PriceSnapshotData {
  productId: string;
  price: number;
  originalPrice: number | null;
  sellersCount: number | null;
  currency: string;
}
