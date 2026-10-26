// `then` es parte de la API de Joi.when, no un thenable.
// oxlint-disable unicorn/no-thenable
import { validateCronExpression } from 'cron';
import Joi from 'joi';

import { APP_NAME } from '../mail/mail.constants.js';

export const env = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().uri().required(),
  TEST_DATABASE_URL: Joi.string().uri().optional(),
  JWT_SECRET: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(32).required(),
    otherwise: Joi.string().required(),
  }),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_ISSUER: Joi.string().default('nudge-api'),
  JWT_AUDIENCE: Joi.string().default('nudge-app'),
  REFRESH_TOKEN_EXPIRES_IN_DAYS: Joi.number().integer().min(1).default(30),
  REFRESH_COOKIE_SAME_SITE: Joi.string().valid('lax', 'strict', 'none').default('lax'),
  ML_CLIENT_ID: Joi.string().required(),
  ML_CLIENT_SECRET: Joi.string().required(),
  ML_REDIRECT_URI: Joi.string().uri().default('https://oauth.pstmn.io/v1/callback'),
  ML_REQUEST_TIMEOUT_MS: Joi.number().integer().min(1000).max(60_000).default(10_000),
  PRICE_REFRESH_ENABLED: Joi.boolean().default(true),
  PRICE_REFRESH_CRON: Joi.string()
    .custom((value: string) => {
      if (!validateCronExpression(value).valid) throw new Error('expresión cron inválida');
      return value;
    })
    .default('0 0,6,12,18 * * *'),
  PRICE_REFRESH_TIMEZONE: Joi.string()
    .custom((value: string) => {
      new Intl.DateTimeFormat('en-US', { timeZone: value });
      return value;
    })
    .default('America/Mexico_City'),
  CORS_ORIGIN: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().pattern(/^[^*]+$/, 'sin comodín').required(),
    otherwise: Joi.string().default('http://localhost:5173'),
  }),
  ADMIN_EMAILS: Joi.string().allow('').default(''),
  RESEND_API_KEY: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().required(),
    otherwise: Joi.string().allow(''),
  }),
  MAIL_FROM: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().required(),
    otherwise: Joi.string().default(`${APP_NAME} <onboarding@resend.dev>`),
  }),
  API_URL: Joi.string().uri().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().uri().required(),
    otherwise: Joi.string().uri().default('http://localhost:3000'),
  }),
  FRONTEND_URL: Joi.string().uri().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().uri().required(),
    otherwise: Joi.string().uri().default('http://localhost:5173'),
  }),
  VERIFICATION_CODE_SECRET: Joi.string().empty('').min(32).when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(32).required(),
    otherwise: Joi.string().min(32).default('dev-only-verification-code-secret-change-me'),
  }),
});
