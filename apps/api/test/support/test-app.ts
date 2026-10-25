import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { getOptionsToken } from '@nestjs/throttler';
import { DataSource } from 'typeorm';

import { AppModule } from '../../src/app.module.js';
import { setupApp } from '../../src/app.setup.js';
import { SessionsService } from '../../src/auth/sessions.service.js';
import { throttlerConfig } from '../../src/config/throttler.js';
import { MailService } from '../../src/mail/mail.service.js';
import { MercadoLibreApiService } from '../../src/mercado-libre/api/mercado-libre-api.service.js';
import { User } from '../../src/users/entities/user.entity.js';
import { FakeMailService } from './fakes/fake-mail.service.js';
import { FakeMercadoLibreApi } from './fakes/fake-mercado-libre-api.js';

export interface TestApp {
  app: INestApplication;
  dataSource: DataSource;
  mail: FakeMailService;
  mercadoLibre: FakeMercadoLibreApi;
  // Access token de una sesión real (crea la fila en sessions), como tras un login.
  tokenFor(user: User): Promise<string>;
  reset(): Promise<void>;
  close(): Promise<void>;
}

// App completa (AppModule) contra la base de pruebas, con correo y Mercado Libre simulados.
// El throttler queda desactivado salvo que se pida `throttle: true`.
export async function createTestApp({ throttle = false } = {}): Promise<TestApp> {
  const mail = new FakeMailService();
  const mercadoLibre = new FakeMercadoLibreApi();

  let builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(MailService)
    .useValue(mail)
    .overrideProvider(MercadoLibreApiService)
    .useValue(mercadoLibre);
  if (!throttle) {
    builder = builder.overrideProvider(getOptionsToken()).useValue({ throttlers: throttlerConfig, skipIf: () => true });
  }

  const moduleRef = await builder.compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>({ logger: false });
  setupApp(app);
  await app.init();

  const dataSource = app.get(DataSource);
  const jwtService = app.get(JwtService);
  const sessionsService = app.get(SessionsService);

  return {
    app,
    dataSource,
    mail,
    mercadoLibre,
    tokenFor: async (user) => {
      const { sid } = await sessionsService.create(user.id, {});
      return jwtService.sign({ sub: user.id, sid });
    },
    reset: async () => {
      mail.reset();
      mercadoLibre.reset();
      await resetDatabase(dataSource);
    },
    close: () => app.close(),
  };
}

// Vacía todas las tablas excepto la de control de migraciones.
export async function resetDatabase(dataSource: DataSource): Promise<void> {
  const tables: { tablename: string }[] = await dataSource.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'migrations'`,
  );
  if (tables.length === 0) return;
  await dataSource.query(`TRUNCATE ${tables.map(({ tablename }) => `"${tablename}"`).join(', ')} CASCADE`);
}
