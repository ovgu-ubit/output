import { EXPORT_ENTITY_TYPES, ExportEntityType } from '@output/interfaces';
import { EXPORT_ENTITY_LABELS } from '@output/interfaces/Workflow';

type ExportEntityDetails = { label: string; relations: string; example: string };

const details: Record<ExportEntityType, ExportEntityDetails> = {
  publication: {
    label: EXPORT_ENTITY_LABELS.publication,
    relations: 'Bisherige Publikationsdaten einschließlich Personen, Instituten, Rechnungen und Kostenpositionen.',
    example: '{ "id": id, "title": title, "doi": doi }',
  },
  author: {
    label: EXPORT_ENTITY_LABELS.author,
    relations: 'Institute (institutes), Vor- und Nachnamenaliase (aliases_first_name, aliases_last_name) und interne Bemerkung (internal_remark).',
    example: '{ "name": first_name & " " & last_name, "remark": internal_remark, "institutes": $join(institutes.label, " | ") }',
  },
  institute: {
    label: EXPORT_ENTITY_LABELS.institute,
    relations: 'Aliase (aliases), direktes Oberinstitut (super_institute) und direkte Unterinstitute (sub_institutes).',
    example: '{ "label": label, "parent": super_institute.label }',
  },
  greater_entity: {
    label: EXPORT_ENTITY_LABELS.greater_entity,
    relations: 'Identifier (identifiers).',
    example: '{ "label": label, "identifiers": identifiers.value }',
  },
  publisher: {
    label: EXPORT_ENTITY_LABELS.publisher,
    relations: 'Aliase (aliases) und DOI-Präfixe (doi_prefixes).',
    example: '{ "label": label, "prefixes": doi_prefixes.doi_prefix }',
  },
  contract: {
    label: EXPORT_ENTITY_LABELS.contract,
    relations: 'Verlag (publisher), Identifier (identifiers) und Bestandteile (components) mit oa_categories, pub_types, greater_entities, cost_types sowie linked_invoices einschließlich cost_center und cost_items.cost_type.',
    example: '{ "label": label, "publisher": publisher.label, "components": components.label }',
  },
  funder: {
    label: EXPORT_ENTITY_LABELS.funder,
    relations: 'Aliase (aliases).',
    example: '{ "label": label, "doi": doi, "ror_id": ror_id }',
  },
  oa_category: {
    label: EXPORT_ENTITY_LABELS.oa_category,
    relations: 'Eigene Felder; keine zusätzlichen Relationen.',
    example: '{ "label": label, "is_oa": is_oa }',
  },
  pub_type: {
    label: EXPORT_ENTITY_LABELS.pub_type,
    relations: 'Aliase (aliases).',
    example: '{ "label": label, "review": review }',
  },
  cost_center: {
    label: EXPORT_ENTITY_LABELS.cost_center,
    relations: 'Eigene Felder; keine zusätzlichen Relationen.',
    example: '{ "label": label, "number": number }',
  },
  cost_type: {
    label: EXPORT_ENTITY_LABELS.cost_type,
    relations: 'Eigene Felder; keine zusätzlichen Relationen.',
    example: '{ "id": id, "label": label }',
  },
};

export const EXPORT_ENTITY_OPTIONS = EXPORT_ENTITY_TYPES.map(value => ({ value, ...details[value] }));

export function getExportEntityDetails(source?: ExportEntityType): ExportEntityDetails {
  return details[source ?? 'publication'];
}
