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
  API_URL: 'https://api.example.test',
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
    'API_URL',
    'VERIFICATION_CODE_SECRET',
  ] as const)('en producción falla si falta %s', (key) => {
    expect(errorOf(without(key))).toContain(key);
  });

  it('en producción exige secretos de al menos 32 caracteres y CORS sin comodín', () => {
    expect(errorOf({ ...production, JWT_SECRET: 'corto' })).toContain('JWT_SECRET');
    expect(errorOf({ ...production, VERIFICATION_CODE_SECRET: 'corto' })).toContain('VERIFICATION_CODE_SECRET');
    expect(errorOf({ ...production, CORS_ORIGIN: '*' })).toContain('CORS_ORIGIN');
  });

  it('las sesiones usan 15 minutos, 30 días y SameSite=lax por defecto', () => {
    const { value } = env.validate(without('JWT_EXPIRES_IN'));
    expect(value).toMatchObject({
      JWT_EXPIRES_IN: '15m',
      JWT_ISSUER: 'nudge-api',
      JWT_AUDIENCE: 'nudge-app',
      REFRESH_TOKEN_EXPIRES_IN_DAYS: 30,
      REFRESH_COOKIE_SAME_SITE: 'lax',
    });
  });

  it('rechaza duración de sesión, SameSite, iss o aud inválidos', () => {
    expect(errorOf({ ...production, REFRESH_TOKEN_EXPIRES_IN_DAYS: 0 })).toContain('REFRESH_TOKEN_EXPIRES_IN_DAYS');
    expect(errorOf({ ...production, REFRESH_COOKIE_SAME_SITE: 'always' })).toContain('REFRESH_COOKIE_SAME_SITE');
    expect(errorOf({ ...production, JWT_ISSUER: '' })).toContain('JWT_ISSUER');
    expect(errorOf({ ...production, JWT_AUDIENCE: '' })).toContain('JWT_AUDIENCE');
  });

  it('el job de precios corre a las 0, 6, 12 y 18 h de la Ciudad de México y Mercado Libre tiene timeout de 10 s', () => {
    const { value } = env.validate(production);
    expect(value).toMatchObject({
      PRICE_REFRESH_CRON: '0 0,6,12,18 * * *',
      PRICE_REFRESH_TIMEZONE: 'America/Mexico_City',
      ML_REQUEST_TIMEOUT_MS: 10_000,
    });
  });

  it('rechaza un cron, una zona horaria o un timeout inválidos', () => {
    expect(errorOf({ ...production, PRICE_REFRESH_CRON: 'cada seis horas' })).toContain('PRICE_REFRESH_CRON');
    expect(errorOf({ ...production, PRICE_REFRESH_TIMEZONE: 'Marte/Olympus' })).toContain('PRICE_REFRESH_TIMEZONE');
    expect(errorOf({ ...production, ML_REQUEST_TIMEOUT_MS: 10 })).toContain('ML_REQUEST_TIMEOUT_MS');
  });

  it('fuera de producción RESEND_API_KEY es opcional', () => {
    expect(errorOf({ ...without('RESEND_API_KEY'), NODE_ENV: 'development' })).toBeUndefined();
  });
});
