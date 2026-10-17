import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    globalSetup: ['test/support/global-setup.ts'],
    setupFiles: ['test/support/setup-env.ts', 'test/support/silence-logger.ts'],
    fileParallelism: false,
    maxWorkers: 1,
    // Comparte los módulos ya cargados entre archivos: importar AppModule es lo más lento.
    isolate: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
