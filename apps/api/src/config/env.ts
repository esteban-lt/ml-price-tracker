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
});
