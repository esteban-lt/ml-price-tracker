import { env } from '../../src/config/env.js';

const production = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://user:pass@db.example.test:5432/nudge',
  JWT_SECRET: 'x'.repeat(32),
  JWT_EXPIRES_IN: '2h',
  ML_CLIENT_ID: 'client-id',
  ML_CLIENT_SECRET: 'client-secret',
  CORS_ORIGIN: 'https://app.example.test',
  RESEND_API_KEY: 're_key',
  MAIL_FROM: 'Nudge <hola@example.test>',
  FRONTEND_URL: 'https://app.example.test',
  VERIFICATION_CODE_SECRET: 'y'.repeat(32),
};
const errorOf = (values: object) => env.validate(values, { abortEarly: false }).error?.message;
const without = (key: keyof typeof production) => {
  const { [key]: _removed, ...rest } = production;
  return rest;
};

describe('validación de variables de entorno', () => {
  it('acepta una configuración de producción completa', () => {
    expect(errorOf(production)).toBeUndefined();
  });

  it.each([
    'DATABASE_URL',
    'JWT_SECRET',
    'ML_CLIENT_ID',
    'ML_CLIENT_SECRET',
    'CORS_ORIGIN',
    'RESEND_API_KEY',
    'MAIL_FROM',
    'FRONTEND_URL',
    'VERIFICATION_CODE_SECRET',
  ] as const)('en producción falla si falta %s', (key) => {
    expect(errorOf(without(key))).toContain(key);
  });

  it('en producción exige secretos de al menos 32 caracteres y CORS sin comodín', () => {
    expect(errorOf({ ...production, JWT_SECRET: 'corto' })).toContain('JWT_SECRET');
    expect(errorOf({ ...production, VERIFICATION_CODE_SECRET: 'corto' })).toContain('VERIFICATION_CODE_SECRET');
    expect(errorOf({ ...production, CORS_ORIGIN: '*' })).toContain('CORS_ORIGIN');
  });

  it('fuera de producción RESEND_API_KEY es opcional', () => {
    expect(errorOf({ ...without('RESEND_API_KEY'), NODE_ENV: 'development' })).toBeUndefined();
  });
});
