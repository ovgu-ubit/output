import * as z from 'zod';

export const EnvSchemas = z
          .object({
            AUTH: z.string().optional(),
            AUTH_API: z.string().optional(),
            APP_PORT: z.coerce.number().int().positive(),
            APP_SSL: z.string().optional(),
            APP_SSL_KEY: z.string().optional(),
            APP_SSL_PUB: z.string().optional(),
            APP_SSL_CHAIN: z.string().optional(),
            APP_SSL_PASSPHRASE: z.string().optional(),
            APP_CORS_ORIGINS: z.string().optional(),
            APP_BASE_PATH: z.string().optional(),
            DATABASE_DROPSCHEMA: z.string().optional(),
            DATABASE_TYPE: z.string(),
            DATABASE_HOST: z.string(),
            DATABASE_PORT: z.coerce.number().int().positive(),
            DATABASE_NAME: z.string(),
            DATABASE_USER: z.string(),
            DATABASE_PASSWORD: z.string(),
            LOG_PATH: z.string(),
            CONFIG_PATH: z.string()
          });