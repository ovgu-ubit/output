import { EXPORT_ENTITY_TYPES, ExportEntityType } from '@output/interfaces';

type ExportEntityDetails = { label: string; relations: string; example: string };

const details: Record<ExportEntityType, ExportEntityDetails> = {
  publication: {
    label: 'Publikationen',
    relations: 'Bisherige Publikationsdaten einschließlich Personen, Instituten, Rechnungen und Kostenpositionen.',
    example: '{ "id": id, "title": title, "doi": doi }',
  },
  author: {
    label: 'Personen',
    relations: 'Institute (institutes), Vor- und Nachnamenaliase (aliases_first_name, aliases_last_name) und interne Bemerkung (internal_remark).',
    example: '{ "name": first_name & " " & last_name, "remark": internal_remark, "institutes": $join(institutes.label, " | ") }',
  },
  institute: {
    label: 'Institute',
    relations: 'Aliase (aliases), direktes Oberinstitut (super_institute) und direkte Unterinstitute (sub_institutes).',
    example: '{ "label": label, "parent": super_institute.label }',
  },
  greater_entity: {
    label: 'Größere Einheiten',
    relations: 'Identifier (identifiers).',
    example: '{ "label": label, "identifiers": identifiers.value }',
  },
  publisher: {
    label: 'Verlage',
    relations: 'Aliase (aliases) und DOI-Präfixe (doi_prefixes).',
    example: '{ "label": label, "prefixes": doi_prefixes.doi_prefix }',
  },
  contract: {
    label: 'Verträge',
    relations: 'Verlag (publisher), Identifier (identifiers) und Bestandteile (components) mit oa_categories, pub_types, greater_entities, cost_types sowie linked_invoices einschließlich cost_center und cost_items.cost_type.',
    example: '{ "label": label, "publisher": publisher.label, "components": components.label }',
  },
  funder: {
    label: 'Förderer',
    relations: 'Aliase (aliases).',
    example: '{ "label": label, "doi": doi, "ror_id": ror_id }',
  },
  oa_category: {
    label: 'OA-Kategorien',
    relations: 'Eigene Felder; keine zusätzlichen Relationen.',
    example: '{ "label": label, "is_oa": is_oa }',
  },
  pub_type: {
    label: 'Publikationsarten',
    relations: 'Aliase (aliases).',
    example: '{ "label": label, "review": review }',
  },
  cost_center: {
    label: 'Kostenstellen',
    relations: 'Eigene Felder; keine zusätzlichen Relationen.',
    example: '{ "label": label, "number": number }',
  },
  cost_type: {
    label: 'Kostenarten',
    relations: 'Eigene Felder; keine zusätzlichen Relationen.',
    example: '{ "id": id, "label": label }',
  },
};

export const EXPORT_ENTITY_OPTIONS = EXPORT_ENTITY_TYPES.map(value => ({ value, ...details[value] }));

export function getExportEntityDetails(source?: ExportEntityType): ExportEntityDetails {
  return details[source ?? 'publication'];
}
