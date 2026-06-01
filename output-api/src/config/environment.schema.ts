import * as z from 'zod';

const optionalBoolean = z.preprocess((value) => {
  if (typeof value !== 'string') return value;
  const normalizedValue = value.trim().toLowerCase();

  if (['true', '1'].includes(normalizedValue)) return true;
  if (['false', '0'].includes(normalizedValue)) return false;

  return value;
}, z.boolean().optional());

export const EnvSchemas = z
  .object({
    AUTH: z.string().optional(),
    AUTH_API: z.string().optional(),
    AUTH_SERVICE_PATH: z.string(),
    AUTH_SERVICE_EXPORT: z.string(),
    APP_PORT: z.coerce.number().int().positive(),
    APP_SSL: z.string().optional(),
    APP_SSL_KEY: z.string().optional(),
    APP_SSL_PUB: z.string().optional(),
    APP_SSL_CHAIN: z.string().optional(),
    APP_SSL_PASSPHRASE: z.string().optional(),
    APP_CORS_ORIGINS: z.string().optional(),
    APP_BASE_PATH: z.string().optional(),
    APP_LOG_PATH: z.string(),
    APP_CONFIG_PATH: z.string(),
    DATABASE_DROPSCHEMA: z.string().optional(),
    DATABASE_TYPE: z.string(),
    DATABASE_HOST: z.string(),
    DATABASE_PORT: z.coerce.number().int().positive(),
    DATABASE_NAME: z.string(),
    DATABASE_USER: z.string(),
    DATABASE_PASSWORD: z.string(),
    DEMO_MODE: optionalBoolean,
    DEMO_USER: z.string().optional(),
    DEMO_PW: z.string().optional(),
    SECRET_UNPAYWALL: z.string().optional(),
    SECRET_OAM: z.string().optional(),
    SECRET_SCOPUS: z.string().optional()
  })
  .superRefine((env, ctx) => {
    if (!env.DEMO_MODE) return;

    if (!env.DEMO_USER) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'DEMO_USER is required when DEMO_MODE is enabled.',
        path: ['DEMO_USER']
      });
    }

    if (!env.DEMO_PW) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'DEMO_PW is required when DEMO_MODE is enabled.',
        path: ['DEMO_PW']
      });
    }
  });
