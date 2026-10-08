export interface ExternalProductData {
  externalId: string;
  name: string;
  url: string;
  imageUrl: string | null;
  price: number;
  originalPrice: number | null;
  sellersCount: number;
  currency: string;
}
