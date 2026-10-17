// `then` es parte de la API de Joi.when, no un thenable.
// oxlint-disable unicorn/no-thenable
import Joi from 'joi';

export const env = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().required(),
  ML_CLIENT_ID: Joi.string().required(),
  ML_CLIENT_SECRET: Joi.string().required(),
  ML_REDIRECT_URI: Joi.string().uri().default('https://oauth.pstmn.io/v1/callback'),
  ML_TOKENS_FILE: Joi.string().default('.ml-tokens.json'),
  PRICE_REFRESH_ENABLED: Joi.boolean().default(true),
  PRICE_REFRESH_INTERVAL_MINUTES: Joi.number().integer().min(1).default(360),
  // En producción es obligatoria y no admite el comodín "*".
  CORS_ORIGIN: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string().pattern(/^[^*]+$/, 'sin comodín').required(),
    otherwise: Joi.string().default('http://localhost:5173'),
  }),
  // Número de proxies frente a la app; 0 = ninguno (se usa la IP de la conexión).
  TRUST_PROXY: Joi.number().integer().min(0).when('NODE_ENV', {
    is: 'production',
    then: Joi.number().default(1),
    otherwise: Joi.number().default(0),
  }),
});
