import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

// Los tests de integración solo pueden usar TEST_DATABASE_URL: sus datos se borran en cada prueba.
export function resolveTestDatabaseUrl(): string {
  const fileEnv = existsSync('.env') ? parseEnv(readFileSync('.env', 'utf8')) : {};
  const testUrl = process.env.TEST_DATABASE_URL || fileEnv.TEST_DATABASE_URL;
  const appUrl = fileEnv.DATABASE_URL;

  if (!testUrl) {
    throw new Error('Falta TEST_DATABASE_URL: los tests de integración nunca usan DATABASE_URL');
  }
  if (appUrl && sameDatabase(testUrl, appUrl)) {
    throw new Error('TEST_DATABASE_URL apunta a la misma base que DATABASE_URL; usa una base exclusiva para tests');
  }
  return testUrl;
}

function sameDatabase(a: string, b: string): boolean {
  const key = (url: string) => {
    const { hostname, port, pathname } = new URL(url);
    return `${hostname}:${port}${pathname}`;
  };
  return key(a) === key(b);
}
