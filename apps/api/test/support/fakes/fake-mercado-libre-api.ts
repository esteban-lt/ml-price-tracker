import { BadGatewayException, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';

import { MercadoLibreProduct } from '../../../src/mercado-libre/api/mercado-libre-api.service.js';

export type ProductBehavior =
  | { price: number; originalPrice?: number | null; name?: string }
  | 'no-sellers'
  | 'rate-limited'
  | 'error';

// Sustituye a MercadoLibreApiService. Lanza los mismos errores que el servicio real
// (ya traducidos a mensajes genéricos) para cada comportamiento.
export class FakeMercadoLibreApi {
  calls: string[] = [];
  private behaviors = new Map<string, ProductBehavior>();

  setProduct(id: string, behavior: ProductBehavior): void {
    this.behaviors.set(id, behavior);
  }

  reset(): void {
    this.calls = [];
    this.behaviors.clear();
  }

  async getProduct(id: string): Promise<MercadoLibreProduct> {
    this.calls.push(id);
    const behavior = this.behaviors.get(id) ?? { price: 1000 };

    if (behavior === 'no-sellers') throw new NotFoundException('No se encontró en Mercado Libre');
    if (behavior === 'rate-limited') {
      throw new HttpException('Mercado Libre está recibiendo demasiadas peticiones', HttpStatus.TOO_MANY_REQUESTS);
    }
    if (behavior === 'error') throw new BadGatewayException('Mercado Libre no respondió correctamente');

    return {
      id,
      name: behavior.name ?? `Producto ${id}`,
      url: `https://www.mercadolibre.com.mx/p/${id}`,
      pictures: ['https://http2.mlstatic.com/imagen.jpg'],
      price: behavior.price,
      originalPrice: behavior.originalPrice ?? null,
      currency: 'MXN',
      freeShipping: true,
      itemId: `${id}-ITEM`,
      sellersCount: 3,
    };
  }
}
