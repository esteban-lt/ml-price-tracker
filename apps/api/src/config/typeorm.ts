import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

// El esquema solo cambia con migraciones (bun run migration:run), en todos los entornos.
export default registerAs('database', (): TypeOrmModuleOptions => ({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  uuidExtension: 'pgcrypto',
  installExtensions: false,
  autoLoadEntities: true,
  synchronize: false,
  migrationsRun: false,
}));
