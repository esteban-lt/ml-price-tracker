import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';

// Configuración global compartida por main.ts y los tests e2e, para que prueben la app tal como corre.
export function setupApp(app: NestExpressApplication): void {
  const configService = app.get(ConfigService);

  // Render tiene un proxy delante: sin esto req.ip sería la del proxy y el throttler limitaría a todos juntos.
  app.set('trust proxy', 1);

  app.enableCors({
    origin: configService
      .getOrThrow<string>('CORS_ORIGIN')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    // Necesario para que el navegador envíe y guarde la cookie del refresh token.
    credentials: true,
  });

  app.use(helmet());
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
