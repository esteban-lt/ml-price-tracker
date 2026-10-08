import { firstValueFrom } from 'rxjs';
import { HttpException, HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { MercadoLibreAuthService } from '../auth/mercado-libre-auth.service.js';

const API_URL = 'https://api.mercadolibre.com';
const SITE_ID = 'MLM';
const PRODUCT_URL = 'https://www.mercadolibre.com.mx/p';
const MAX_CONCURRENCY = 10;
export const SEARCH_BATCH_SIZE = 50;
export const SEARCH_MAX_PAGES = 3;

export interface MercadoLibreProduct {
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

export interface MercadoLibreListedProduct extends MercadoLibreProduct {
  position: number;
}

export interface MercadoLibreSearchResult {
  query: string;
  page: number;
  hasMore: boolean;
  products: MercadoLibreListedProduct[];
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
  buy_box_winner?: ProductItem | null;
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

  async getProduct(productId: string): Promise<MercadoLibreProduct> {
    let catalogProduct: CatalogProduct;
    try {
      catalogProduct = await this.get<CatalogProduct>(`/products/${productId}`);
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === HttpStatus.NOT_FOUND) {
        throw new NotFoundException(`El producto ${productId} no existe en el catálogo de Mercado Libre`);
      }
      throw error;
    }

    const product = await this.withOffers(catalogProduct);
    if (!product) {
      throw new NotFoundException(`El producto ${productId} no está activo o no tiene vendedores en Mercado Libre`);
    }
    return product;
  }

  async getProductsByCategory(categoryId: string): Promise<MercadoLibreListedProduct[]> {
    const { content } = await this.get<Highlights>(`/highlights/${SITE_ID}/category/${categoryId}`);
    const highlights = content.filter((highlight) => highlight.type === 'PRODUCT');

    const products = await mapWithConcurrency(highlights, ({ id, position }) =>
      this.toListedProduct(() => this.get<CatalogProduct>(`/products/${id}`), id, position),
    );

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
      this.toListedProduct(async () => product, product.id, offset + index + 1),
    );

    return {
      query,
      page,
      hasMore: page < SEARCH_MAX_PAGES && offset + results.length < paging.total,
      products: products.filter((product) => product !== null),
    };
  }

  // En los listados un producto que falla se descarta para no tumbar toda la respuesta.
  private async toListedProduct(
    loadCatalogProduct: () => Promise<CatalogProduct>,
    productId: string,
    position: number,
  ): Promise<MercadoLibreListedProduct | null> {
    try {
      const product = await this.withOffers(await loadCatalogProduct());
      return product && { position, ...product };
    } catch (error) {
      this.logger.warn(`Se descartó el producto ${productId}: ${(error as Error).message}`);
      return null;
    }
  }

  private async withOffers(product: CatalogProduct): Promise<MercadoLibreProduct | null> {
    if (product.status !== 'active') return null;

    const items = await this.getProductItems(product);
    if (items.length === 0) return null;

    const cheapest = items.reduce((min, item) => (item.price < min.price ? item : min));
    return {
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

  private async getProductItems(product: CatalogProduct): Promise<ProductItem[]> {
    try {
      const { results } = await this.get<{ results: ProductItem[] }>(`/products/${product.id}/items`);
      return results;
    } catch (error) {
      if (!(error instanceof HttpException)) throw error;

      const status = error.getStatus();
      if (status === HttpStatus.NOT_FOUND) return [];

      // Mercado Libre restringe /items en algunos productos; buy_box_winner trae al menos la oferta ganadora.
      if (status === HttpStatus.FORBIDDEN || status === HttpStatus.GONE) {
        this.logger.warn(`/products/${product.id}/items respondió ${status}; se usa buy_box_winner`);
        return product.buy_box_winner ? [product.buy_box_winner] : [];
      }
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
