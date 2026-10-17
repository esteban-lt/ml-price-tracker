import { BadGatewayException, HttpException, HttpStatus, Injectable } from '@nestjs/common';

import {
  MercadoLibreApiService,
  MercadoLibreProduct,
} from '../../mercado-libre/api/mercado-libre-api.service.js';
import { StoreEnum } from '../entities/product.entity.js';
import { ExternalProductData } from '../interfaces/external-product-data.js';
import { ProductProvider } from '../interfaces/product-provider.js';

const PASSTHROUGH_STATUSES = new Set<number>([
  HttpStatus.NOT_FOUND,
  HttpStatus.TOO_MANY_REQUESTS,
  HttpStatus.SERVICE_UNAVAILABLE,
]);

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

  // Se conservan 404 (producto inválido), 429 (demasiadas peticiones) y 503 (sin autorizar);
  // cualquier otro error de Mercado Libre se expone como 502 para no confundirlo con un error del cliente.
  private async getProduct(externalId: string): Promise<MercadoLibreProduct> {
    try {
      return await this.mercadoLibreApiService.getProduct(externalId);
    } catch (error) {
      if (error instanceof HttpException && PASSTHROUGH_STATUSES.has(error.getStatus())) throw error;
      throw new BadGatewayException(`No se pudo consultar el producto ${externalId} en Mercado Libre`);
    }
  }
}
