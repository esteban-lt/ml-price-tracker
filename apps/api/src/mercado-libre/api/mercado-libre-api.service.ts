import { firstValueFrom } from 'rxjs';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { MercadoLibreAuthService } from '../auth/mercado-libre-auth.service.js';

const API_URL = 'https://api.mercadolibre.com';
const SITE_ID = 'MLM';
const PRODUCT_URL = 'https://www.mercadolibre.com.mx/p';
const MAX_CONCURRENCY = 10;
export const SEARCH_BATCH_SIZE = 50;
export const SEARCH_MAX_PAGES = 3;

export interface MercadoLibreProduct {
  position: number;
  id: string;
  name: string;
  url: string;
  pictures: string[];
  price: number;
  originalPrice: number | null;
  currency: string;
  freeShipping: boolean;
  itemId: string;
  sellersCount: number;
}

export interface MercadoLibreSearchResult {
  query: string;
  page: number;
  hasMore: boolean;
  products: MercadoLibreProduct[];
}

interface Highlights {
  content: { id: string; position: number; type: 'PRODUCT' | 'USER_PRODUCT' | 'ITEM' }[];
}

interface ProductSearch {
  paging: { total: number };
  results: CatalogProduct[];
}

interface CatalogProduct {
  id: string;
  name: string;
  status: string;
  pictures: { url: string }[];
}

interface ProductItem {
  item_id: string;
  price: number;
  original_price: number | null;
  currency_id: string;
  shipping: { free_shipping: boolean };
}

interface HttpErrorLike {
  response?: { status?: number; data?: unknown };
}

@Injectable()
export class MercadoLibreApiService {
  private readonly logger = new Logger(MercadoLibreApiService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly authService: MercadoLibreAuthService,
  ) {}

  async getProductsByCategory(categoryId: string): Promise<MercadoLibreProduct[]> {
    const { content } = await this.get<Highlights>(`/highlights/${SITE_ID}/category/${categoryId}`);
    const highlights = content.filter((highlight) => highlight.type === 'PRODUCT');

    const products = await mapWithConcurrency(highlights, async ({ id, position }) => {
      try {
        return this.withOffers(await this.get<CatalogProduct>(`/products/${id}`), position);
      } catch (error) {
        this.logger.warn(`Se descartó el producto ${id}: ${(error as Error).message}`);
        return null;
      }
    });

    return products.filter((product) => product !== null);
  }

  async searchProducts(query: string, page: number): Promise<MercadoLibreSearchResult> {
    const offset = (page - 1) * SEARCH_BATCH_SIZE;
    const params = new URLSearchParams({
      site_id: SITE_ID,
      status: 'active',
      q: query,
      limit: String(SEARCH_BATCH_SIZE),
      offset: String(offset),
    });
    const { paging, results } = await this.get<ProductSearch>(`/products/search?${params.toString()}`);

    const products = await mapWithConcurrency(results, (product, index) =>
      this.withOffers(product, offset + index + 1),
    );

    return {
      query,
      page,
      hasMore: page < SEARCH_MAX_PAGES && offset + results.length < paging.total,
      products: products.filter((product) => product !== null),
    };
  }

  private async withOffers(product: CatalogProduct, position: number): Promise<MercadoLibreProduct | null> {
    if (product.status !== 'active') return null;

    let items: ProductItem[];
    try {
      items = await this.getProductItems(product.id);
    } catch (error) {
      this.logger.warn(`Se descartó el producto ${product.id}: ${(error as Error).message}`);
      return null;
    }
    if (items.length === 0) return null;

    const cheapest = items.reduce((min, item) => (item.price < min.price ? item : min));
    return {
      position,
      id: product.id,
      name: product.name,
      url: `${PRODUCT_URL}/${product.id}`,
      pictures: product.pictures.map((picture) => picture.url),
      price: cheapest.price,
      originalPrice: cheapest.original_price,
      currency: cheapest.currency_id,
      freeShipping: cheapest.shipping.free_shipping,
      itemId: cheapest.item_id,
      sellersCount: items.length,
    };
  }

  private async getProductItems(productId: string): Promise<ProductItem[]> {
    try {
      const { results } = await this.get<{ results: ProductItem[] }>(`/products/${productId}/items`);
      return results;
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === HttpStatus.NOT_FOUND) return [];
      throw error;
    }
  }

  private async get<T>(path: string, isRetry = false): Promise<T> {
    const token = await this.authService.getValidToken();

    try {
      const response = await firstValueFrom(
        this.httpService.get<T>(`${API_URL}${path}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
      return response.data;
    } catch (error) {
      const { status, data } = (error as HttpErrorLike).response ?? {};

      if (status === HttpStatus.UNAUTHORIZED && !isRetry) {
        this.authService.invalidateAccessToken();
        return this.get<T>(path, true);
      }

      if (status !== HttpStatus.NOT_FOUND) {
        this.logger.error(`Error en GET ${path} de Mercado Libre: ${JSON.stringify(data ?? String(error))}`);
      }
      throw new HttpException(
        { message: `Mercado Libre respondió con error en ${path}`, mercadoLibre: data },
        status ?? HttpStatus.BAD_GATEWAY,
      );
    }
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENCY, items.length) }, worker));
  return results;
}
