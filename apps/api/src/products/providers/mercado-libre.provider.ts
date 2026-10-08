import {
  BadGatewayException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import {
  MercadoLibreApiService,
  MercadoLibreProduct,
} from '../../mercado-libre/api/mercado-libre-api.service.js';
import { StoreEnum } from '../entities/product.entity.js';
import { ExternalProductData } from '../interfaces/external-product-data.js';
import { ProductProvider } from '../interfaces/product-provider.js';

@Injectable()
export class MercadoLibreProvider implements ProductProvider {
  readonly store = StoreEnum.MERCADO_LIBRE;

  constructor(private readonly mercadoLibreApiService: MercadoLibreApiService) {}

  async fetchProductData(externalId: string): Promise<ExternalProductData> {
    const product = await this.getProduct(externalId);

    return {
      externalId: product.id,
      name: product.name,
      url: product.url,
      imageUrl: product.pictures[0] ?? null,
      price: product.price,
      originalPrice: product.originalPrice,
      sellersCount: product.sellersCount,
      currency: product.currency,
    };
  }

  // Los errores propios de Mercado Libre (401, 429, 5xx, red) se exponen como 502 para no
  // confundirlos con errores del cliente; 404 (producto inválido) y 503 (sin autorizar) se conservan.
  private async getProduct(externalId: string): Promise<MercadoLibreProduct> {
    try {
      return await this.mercadoLibreApiService.getProduct(externalId);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ServiceUnavailableException) throw error;
      throw new BadGatewayException(`No se pudo consultar el producto ${externalId} en Mercado Libre`);
    }
  }
}
