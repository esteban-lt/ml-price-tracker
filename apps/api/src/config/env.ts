// `then` es parte de la API de Joi.when, no un thenable.
// oxlint-disable unicorn/no-thenable
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
  JWT_EXPIRES_IN: Joi.string().required(),
  ML_CLIENT_ID: Joi.string().required(),
  ML_CLIENT_SECRET: Joi.string().required(),
  ML_REDIRECT_URI: Joi.string().uri().default('https://oauth.pstmn.io/v1/callback'),
  PRICE_REFRESH_ENABLED: Joi.boolean().default(true),
  PRICE_REFRESH_INTERVAL_MINUTES: Joi.number().integer().min(1).default(360),
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
