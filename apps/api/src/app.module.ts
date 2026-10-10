import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { env } from './config/env.js';
import typeorm from './config/typeorm.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ProductsModule } from './products/products.module.js';
import { MercadoLibreModule } from './mercado-libre/mercado-libre.module.js';
import { PriceHistoryModule } from './price-history/price-history.module.js';
import { TrackedProductsModule } from './tracked-products/tracked-products.module.js';
import { PriceRefreshModule } from './price-refresh/price-refresh.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: env,
      load: [typeorm],
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return configService.getOrThrow('database');
      },
    }),

    ScheduleModule.forRoot(),

    AuthModule,
    UsersModule,
    ProductsModule,
    MercadoLibreModule,
    PriceHistoryModule,
    TrackedProductsModule,
    PriceRefreshModule,
  ],
})
export class AppModule {}
