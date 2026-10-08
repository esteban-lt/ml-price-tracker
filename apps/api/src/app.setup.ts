import { INestApplication, ValidationPipe } from '@nestjs/common';

// Configuración global compartida por main.ts y los tests e2e, para que prueben la app tal como corre.
export function setupApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
