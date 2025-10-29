import { z } from 'zod';
import { CONFIG_DEFAULTS } from './config.defaults';

export const ConfigSchemas = z.object({
    reporting_year: z.number().int().min(1850).default(CONFIG_DEFAULTS.reporting_year),
    institution: z.string().default(CONFIG_DEFAULTS.institution),
    institution_short_label: z.string().max(10).default(CONFIG_DEFAULTS.institution_short_label),
    search_tags: z.array(z.string()),
    affiliation_tags: z.array(z.string()),
  // weitere Scopes ...
});

export type ScopeName = keyof typeof ConfigSchemas;

export function validateConfigValue(key: string, value: unknown) {
  const schema = ConfigSchemas;
  if (!schema) return; // unbekannter Key → dito
  const res = (schema[key]).safeParse(value);
  if (!res.success) {
    // aussagekräftige Fehlermeldung zurückgeben
    throw new Error(res.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));
  }
  return res.data;
}