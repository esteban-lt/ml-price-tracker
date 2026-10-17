import { resolveTestDatabaseUrl } from './test-database.js';

export const TEST_ADMIN_EMAIL = 'admin@example.test';

// Se ejecuta antes de importar cada archivo de pruebas, así ConfigModule valida estos valores
// (dotenv no sobrescribe variables ya definidas). Credenciales falsas: nada sale a servicios reales.
Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: resolveTestDatabaseUrl(),
  JWT_SECRET: 'test-jwt-secret-with-at-least-32-characters',
  JWT_EXPIRES_IN: '1h',
  VERIFICATION_CODE_SECRET: 'test-verification-secret-with-32-characters',
  ML_CLIENT_ID: 'test-client-id',
  ML_CLIENT_SECRET: 'test-client-secret',
  RESEND_API_KEY: '',
  PRICE_REFRESH_ENABLED: 'false',
  ADMIN_EMAILS: TEST_ADMIN_EMAIL,
});
