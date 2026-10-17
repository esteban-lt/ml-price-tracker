import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DataSource, EntitySchema } from 'typeorm';

import { Alert } from '../../src/alerts/entities/alert.entity.js';
import { EmailVerificationCode } from '../../src/auth/entities/email-verification-code.entity.js';
import { TrackedProduct } from '../../src/tracked-products/entities/tracked-product.entity.js';
import { User } from '../../src/users/entities/user.entity.js';
import { resolveTestDatabaseUrl } from '../support/test-database.js';
import {
  createAlert,
  createProduct,
  createSnapshot,
  createTracking,
  createUser,
} from '../support/factories.js';
import { createTestApp, TestApp } from '../support/test-app.js';

// Todas las clases de src/**/*.entity.ts: una entidad nueva sin migración hace fallar el test.
async function loadEntities(): Promise<(Function | EntitySchema)[]> {
  const files = (readdirSync(resolve('src'), { recursive: true }) as string[]).filter((file) =>
    file.endsWith('.entity.ts'),
  );
  const modules = await Promise.all(files.map((file) => import(pathToFileURL(join(resolve('src'), file)).href)));
  return modules.flatMap((module) => Object.values(module).filter((value) => typeof value === 'function')) as Function[];
}

describe('Esquema de la base (e2e)', () => {
  it('las migraciones dejan la base igual a las entidades (no falta ninguna migración)', async () => {
    const dataSource = new DataSource({
      type: 'postgres',
      url: resolveTestDatabaseUrl(),
      uuidExtension: 'pgcrypto',
      installExtensions: false,
      entities: await loadEntities(),
    });
    await dataSource.initialize();
    try {
      const pending = await dataSource.driver.createSchemaBuilder().log();
      expect(pending.upQueries.map((query) => query.query)).toEqual([]);
    } finally {
      await dataSource.destroy();
    }
  });

  describe('borrados en cascada', () => {
    let t: TestApp;

    beforeAll(async () => {
      t = await createTestApp();
    });

    afterAll(async () => {
      await t.close();
    });

    beforeEach(async () => {
      await t.reset();
    });

    const givenUserWithData = async () => {
      const user = await createUser(t.dataSource);
      const product = await createProduct(t.dataSource);
      const tracking = await createTracking(t.dataSource, { user, product });
      const snapshot = await createSnapshot(t.dataSource, product, 800);
      const alert = await createAlert(t.dataSource, { tracking, snapshot });
      await t.dataSource.getRepository(EmailVerificationCode).save({
        userId: user.id,
        codeHash: 'hash',
        expiresAt: new Date(Date.now() + 60_000),
      });
      return { user, tracking, alert };
    };

    it('eliminar un usuario borra sus seguimientos, alertas y código de verificación', async () => {
      const { user, tracking, alert } = await givenUserWithData();

      await t.dataSource.getRepository(User).delete(user.id);

      expect(await t.dataSource.getRepository(TrackedProduct).countBy({ id: tracking.id })).toBe(0);
      expect(await t.dataSource.getRepository(Alert).countBy({ id: alert.id })).toBe(0);
      expect(await t.dataSource.getRepository(EmailVerificationCode).countBy({ userId: user.id })).toBe(0);
    });

    it('eliminar un seguimiento borra sus alertas pero no al usuario', async () => {
      const { user, tracking, alert } = await givenUserWithData();

      await t.dataSource.getRepository(TrackedProduct).delete(tracking.id);

      expect(await t.dataSource.getRepository(Alert).countBy({ id: alert.id })).toBe(0);
      expect(await t.dataSource.getRepository(User).countBy({ id: user.id })).toBe(1);
    });
  });
});
