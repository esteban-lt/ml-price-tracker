import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { setupApp } from './app.setup.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');
  const configService = app.get(ConfigService);

  setupApp(app);
  // Cierra la conexión a la base y detiene los jobs cuando Render manda SIGTERM al redesplegar.
  app.enableShutdownHooks();

  const port = configService.getOrThrow<number>('PORT');
  await app.listen(port);
  logger.log(`App running on port ${port}`)
}
await bootstrap();
