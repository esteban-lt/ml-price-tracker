import { Module } from '@nestjs/common';

import { AmazonProvider } from './providers/amazon.provider.js';
import { MercadoLibreProvider } from './providers/mercado-libre.provider.js';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';
import { PRODUCT_PROVIDERS, ProviderRegistry } from './providers/provider-registry.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity.js';

@Module({
  controllers: [ProductsController],
  imports: [
    TypeOrmModule.forFeature([Product]),
  ],
  providers: [
    ProductsService,
    ProviderRegistry,
    MercadoLibreProvider,
    AmazonProvider,
    {
      provide: PRODUCT_PROVIDERS,
      useFactory: (mercadoLibre: MercadoLibreProvider, amazon: AmazonProvider) => [mercadoLibre, amazon],
      inject: [MercadoLibreProvider, AmazonProvider],
    },
  ],
  exports: [ProductsService],
})
export class ProductsModule {}
