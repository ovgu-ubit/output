import * as z from 'zod';
import { CONFIG_DEFAULTS } from './config.defaults';

export const ConfigSchemas = z.object({
    reporting_year: z.number().int().min(1850).default(CONFIG_DEFAULTS.reporting_year),
    lock_timeout: z.number().int().min(0).default(CONFIG_DEFAULTS.lock_timeout),
    institution: z.string().default(CONFIG_DEFAULTS.institution),
    institution_short_label: z.string().max(10).default(CONFIG_DEFAULTS.institution_short_label),
    search_tags: z.array(z.string()).default(CONFIG_DEFAULTS.search_tags),
    affiliation_tags: z.array(z.string()).default(CONFIG_DEFAULTS.affiliation_tags),
    ror_id: z.string().regex(/^https:\/\/ror\.org\/.*/).default(CONFIG_DEFAULTS.ror_id),
    openalex_id: z.string().default(CONFIG_DEFAULTS.openalex_id),
    doi_import_service: z.string().default(CONFIG_DEFAULTS.doi_import_service),
    optional_fields_abstract: z.boolean().default(CONFIG_DEFAULTS.optional_fields_abstract),
    optional_fields_citation: z.boolean().default(CONFIG_DEFAULTS.optional_fields_citation),
    optional_fields_page_count: z.boolean().default(CONFIG_DEFAULTS.optional_fields_page_count),
    optional_fields_pub_date_submitted: z.boolean().default(CONFIG_DEFAULTS.optional_fields_pub_date_submitted),
    optional_fields_pub_date_print: z.boolean().default(CONFIG_DEFAULTS.optional_fields_pub_date_print),
    optional_fields_peer_reviewed: z.boolean().default(CONFIG_DEFAULTS.optional_fields_peer_reviewed),
    pub_index_columns: z.object({
        title: z.boolean(),
        doi: z.boolean(),
        link: z.boolean(),
        authors: z.boolean(),
        authors_inst: z.boolean(),
        corr_inst: z.boolean(),
        greater_entity: z.boolean(),
        oa_category: z.boolean(),
        pub_type: z.boolean(),
        contract: z.boolean(),
        publisher: z.boolean(),
        locked_status: z.boolean(),
        status: z.boolean(),
        pub_date: z.boolean(),
        edit_date: z.boolean(),
        import_date: z.boolean(),
        data_source: z.boolean(),
    }).default(CONFIG_DEFAULTS.pub_index_columns),
    import_services: z.object({
        base: z.boolean(),
        bibliography_md: z.boolean(),
        crossref: z.boolean(),
        open_access_monitor: z.boolean(),
        openalex: z.boolean(),
        pubmed: z.boolean(),
        scopus: z.boolean()
    }).default(CONFIG_DEFAULTS.import_services),
    enrich_services: z.object({
        crossref: z.boolean(),
        doaj: z.boolean(),
        open_access_monitor: z.boolean(),
        openalex: z.boolean(),
        openapc: z.boolean(),
        scopus: z.boolean(),
        unpaywall: z.boolean()
    }).default(CONFIG_DEFAULTS.enrich_services)
});

export function validateConfigValue(key: string, value: unknown) {
  const schema = ConfigSchemas;
  if (!schema) return; // unbekannter Key → dito
  const res = (schema.shape[key]).safeParse(value);
  if (!res.success) {
    // aussagekräftige Fehlermeldung zurückgeben
    throw new Error(res.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));
  }
  return res.data;
}