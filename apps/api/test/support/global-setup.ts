import { readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DataSource, MigrationInterface } from 'typeorm';

import { resolveTestDatabaseUrl } from './test-database.js';

type MigrationClass = new () => MigrationInterface;

// Aplica a la base de pruebas las mismas migraciones que producción.
export default async function setup(): Promise<void> {
  const dataSource = new DataSource({
    type: 'postgres',
    url: resolveTestDatabaseUrl(),
    installExtensions: false,
    migrations: await loadMigrations(),
  });

  await dataSource.initialize();
  try {
    await dataSource.runMigrations();
  } finally {
    await dataSource.destroy();
  }
}

async function loadMigrations(): Promise<MigrationClass[]> {
  const directory = resolve('migrations');
  const files = readdirSync(directory).filter((file) => file.endsWith('.ts'));
  const modules = await Promise.all(files.map((file) => import(pathToFileURL(join(directory, file)).href)));
  return modules.flatMap((module) => Object.values(module) as MigrationClass[]);
}
