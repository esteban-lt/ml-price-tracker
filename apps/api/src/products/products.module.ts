import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MercadoLibreModule } from '../mercado-libre/mercado-libre.module.js';
import { Product } from './entities/product.entity.js';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';
import { AmazonProvider } from './providers/amazon.provider.js';
import { MercadoLibreProvider } from './providers/mercado-libre.provider.js';
import { PRODUCT_PROVIDERS, ProviderRegistry } from './providers/provider-registry.js';

@Module({
  imports: [TypeOrmModule.forFeature([Product]), MercadoLibreModule],
  controllers: [ProductsController],
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
