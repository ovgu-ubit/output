export interface Config {
    key: string;
    description?: string;
    value: any;
    scope?: 'public' | 'user' | 'admin';
}

export class AppError {
    origin: string;
    text: string;
}

export interface HealthState {
  status: "ok" | "error";
  timestamp: string;
  uptime: number;
  checks: {
    database: "up" | "down";
  };
}

export class UpdateMapping {
    author_inst: UpdateOptions = UpdateOptions.APPEND;
    authors: UpdateOptions = UpdateOptions.REPLACE_IF_EMPTY;
    title: UpdateOptions = UpdateOptions.IGNORE;
    pub_type: UpdateOptions = UpdateOptions.REPLACE_IF_EMPTY;
    oa_category: UpdateOptions = UpdateOptions.REPLACE_IF_EMPTY;
    greater_entity: UpdateOptions = UpdateOptions.REPLACE_IF_EMPTY;
    publisher: UpdateOptions = UpdateOptions.REPLACE_IF_EMPTY;
    contract: UpdateOptions = UpdateOptions.REPLACE_IF_EMPTY;
    funder: UpdateOptions = UpdateOptions.APPEND;
    doi: UpdateOptions = UpdateOptions.REPLACE_IF_EMPTY;
    pub_date: UpdateOptions = UpdateOptions.REPLACE_IF_EMPTY;
    link: UpdateOptions = UpdateOptions.REPLACE_IF_EMPTY;
    language: UpdateOptions = UpdateOptions.REPLACE_IF_EMPTY;
    license: UpdateOptions = UpdateOptions.REPLACE_IF_EMPTY;
    invoice: UpdateOptions = UpdateOptions.REPLACE_IF_EMPTY;
    status: UpdateOptions = UpdateOptions.REPLACE_IF_EMPTY;
    abstract: UpdateOptions = UpdateOptions.REPLACE_IF_EMPTY;
    citation: UpdateOptions = UpdateOptions.REPLACE_IF_EMPTY;
    page_count: UpdateOptions = UpdateOptions.REPLACE_IF_EMPTY;
    peer_reviewed: UpdateOptions = UpdateOptions.REPLACE_IF_EMPTY;
    cost_approach: UpdateOptions = UpdateOptions.REPLACE_IF_EMPTY;
}

export enum UpdateOptions {
    IGNORE,
    REPLACE,
    REPLACE_IF_EMPTY,
    APPEND
}

export class CSVMapping {
    name: string;
    encoding: string;
    header: boolean;
    quotes: boolean;
    delimiter: string;
    quoteChar?: string;
    date_format?: string;
    id_ge_type?: string;
    last_name_first: boolean;
    split_authors?: string;
    deal_flat_fee?: boolean;
    mapping: {
        author_inst?: string;
        authors?: string;
        title?: string;
        pub_type?: string;
        oa_category?: string;
        greater_entity?: string;
        id_ge?: string;
        publisher?: string;
        contract?: string;
        funder?: string;
        doi?: string;
        pub_date?: string;
        pub_date_print?: string;
        pub_date_accepted?: string;
        pub_date_submitted?: string;
        link?: string;
        language?: string;
        license?: string;
        invoice?: string;
        status?: string;
        abstract?: string;
        volume?: string;
        issue?: string;
        first_page?: string;
        last_page?: string;
        page_count?: string;
        peer_reviewed?: string;
        publisher_location?: string;
        edition?: string;
        article_number?: string;
        cost_approach?: string;
        cost_approach_currency?: string;
    }
}

export class SearchFilter {
    expressions: SearchFilterExpression[];
}

export type SearchFilterValue = string | number | boolean | null | Array<string | number | boolean>;

export class SearchFilterExpression {
    op: JoinOperation;
    key: string;
    comp: CompareOperation;
    value: SearchFilterValue;
}

export enum CompareOperation {
    INCLUDES,
    EQUALS,
    STARTS_WITH,
    GREATER_THAN,
    SMALLER_THAN,
    IN
}

export enum JoinOperation {
    AND,
    OR,
    AND_NOT
}

export type PublicationFilterFieldType = 'string' | 'number' | 'id' | 'date' | 'boolean' | 'year';

export type PublicationFilterOptionalField =
    | 'abstract'
    | 'citation'
    | 'page_count'
    | 'peer_reviewed'
    | 'pub_date_print'
    | 'pub_date_submitted';

export interface PublicationFilterFieldDefinition {
    key: string;
    label: string;
    type: PublicationFilterFieldType;
    optionalField?: PublicationFilterOptionalField;
    legacyKeys?: string[];
}

export const PUBLICATION_FILTER_OPERATIONS_BY_TYPE: Record<PublicationFilterFieldType, CompareOperation[]> = {
    string: [
        CompareOperation.INCLUDES,
        CompareOperation.EQUALS,
        CompareOperation.STARTS_WITH,
        CompareOperation.IN,
    ],
    number: [
        CompareOperation.EQUALS,
        CompareOperation.GREATER_THAN,
        CompareOperation.SMALLER_THAN,
        CompareOperation.IN,
    ],
    id: [
        CompareOperation.EQUALS,
        CompareOperation.IN,
    ],
    date: [
        CompareOperation.EQUALS,
        CompareOperation.GREATER_THAN,
        CompareOperation.SMALLER_THAN,
    ],
    boolean: [
        CompareOperation.EQUALS,
    ],
    year: [
        CompareOperation.EQUALS,
        CompareOperation.GREATER_THAN,
        CompareOperation.SMALLER_THAN,
        CompareOperation.IN,
    ],
};

export const PUBLICATION_FILTER_FIELD_DEFINITIONS: PublicationFilterFieldDefinition[] = [
    { key: 'id', label: 'ID', type: 'id' },
    { key: 'title', label: 'Titel', type: 'string' },
    { key: 'doi', label: 'DOI', type: 'string' },
    { key: 'other_ids', label: 'Weitere Identifikatoren', type: 'string' },
    { key: 'authors', label: 'Autor*innen-Angabe', type: 'string' },
    { key: 'inst_authors', label: 'Personen der Institution', type: 'string' },
    { key: 'author_id', label: 'ID einer Person der Institution', type: 'id' },
    { key: 'author_id_corr', label: 'ID einer Person der Institution (corr.)', type: 'id' },
    { key: 'institute', label: 'Institute', type: 'string' },
    { key: 'institute_id', label: 'ID eines Instituts', type: 'id' },
    { key: 'institute_id_corr', label: 'ID eines Instituts (corr.)', type: 'id' },
    { key: 'pub_date', label: 'Publikationsdatum', type: 'date' },
    { key: 'pub_date_accepted', label: 'Datum der Akzeptanz', type: 'date' },
    { key: 'pub_date_submitted', label: 'Datum der Einreichung', type: 'date', optionalField: 'pub_date_submitted' },
    { key: 'pub_date_print', label: 'Publikationsdatum (print)', type: 'date', optionalField: 'pub_date_print' },
    { key: 'greater_entity', label: 'Größere Einheit', type: 'string' },
    { key: 'greater_entity_id', label: 'ID einer größeren Einheit', type: 'id' },
    { key: 'oa_category', label: 'OA-Kategorie', type: 'string' },
    { key: 'oa_category_id', label: 'ID einer OA-Kategorie', type: 'id' },
    { key: 'link', label: 'Link', type: 'string' },
    { key: 'dataSource', label: 'Datenquelle', type: 'string' },
    { key: 'language', label: 'Sprache', type: 'string' },
    { key: 'second_pub', label: 'Zweitveröffentlichung', type: 'string', legacyKeys: ['secound_pub'] },
    { key: 'add_info', label: 'Weitere Informationen', type: 'string' },
    { key: 'locked', label: 'Gesperrt', type: 'boolean' },
    { key: 'locked_author', label: 'Autor*innen gesperrt', type: 'boolean' },
    { key: 'locked_biblio', label: 'Bibliografie gesperrt', type: 'boolean' },
    { key: 'locked_finance', label: 'Finanzen gesperrt', type: 'boolean' },
    { key: 'locked_oa', label: 'OA gesperrt', type: 'boolean' },
    { key: 'locked_at', label: 'Sperrdatum', type: 'date' },
    { key: 'status', label: 'Status', type: 'number' },
    { key: 'pub_type', label: 'Publikationstyp', type: 'string' },
    { key: 'pub_type_id', label: 'ID eines Publikationstyps', type: 'id' },
    { key: 'publisher', label: 'Verlag', type: 'string' },
    { key: 'publisher_id', label: 'ID eines Verlags', type: 'id' },
    { key: 'contract', label: 'Vertrag', type: 'string' },
    { key: 'contract_id', label: 'ID eines Vertrags', type: 'id' },
    { key: 'funder', label: 'Förderer', type: 'string' },
    { key: 'funder_id', label: 'ID eines Förderers', type: 'id' },
    { key: 'cost_center', label: 'Kostenstelle', type: 'string' },
    { key: 'cost_center_id', label: 'ID einer Kostenstelle', type: 'id' },
    { key: 'cost_type', label: 'Kostenart', type: 'string' },
    { key: 'cost_type_id', label: 'ID einer Kostenart', type: 'id' },
    { key: 'invoice_year', label: 'Rechnungsjahr', type: 'year' },
    { key: 'contract_year', label: 'Vertragsjahr', type: 'year' },
    { key: 'edit_date', label: 'Letzte Bearbeitung', type: 'date' },
    { key: 'import_date', label: 'Importdatum', type: 'date' },
    { key: 'delete_date', label: 'Löschdatum', type: 'date' },
    { key: 'is_oa', label: 'Open Access', type: 'boolean' },
    { key: 'oa_status', label: 'OA-Status', type: 'string' },
    { key: 'is_journal_oa', label: 'Journal Open Access', type: 'boolean' },
    { key: 'best_oa_host', label: 'Bester OA-Host', type: 'string' },
    { key: 'best_oa_license', label: 'Beste OA-Lizenz', type: 'string' },
    { key: 'abstract', label: 'Abstract', type: 'string', optionalField: 'abstract' },
    { key: 'volume', label: 'Volume', type: 'string', optionalField: 'citation' },
    { key: 'issue', label: 'Issue', type: 'string', optionalField: 'citation' },
    { key: 'first_page', label: 'Erste Seite', type: 'string', optionalField: 'citation' },
    { key: 'last_page', label: 'Letzte Seite', type: 'string', optionalField: 'citation' },
    { key: 'publisher_location', label: 'Verlagsort', type: 'string', optionalField: 'citation' },
    { key: 'edition', label: 'Auflage', type: 'string', optionalField: 'citation' },
    { key: 'article_number', label: 'Artikelnummer', type: 'string', optionalField: 'citation' },
    { key: 'page_count', label: 'Seitenzahl', type: 'number', optionalField: 'page_count' },
    { key: 'peer_reviewed', label: 'Peer-Reviewed', type: 'boolean', optionalField: 'peer_reviewed' },
    { key: 'cost_approach', label: 'Kostenansatz', type: 'number' },
    { key: 'cost_approach_currency', label: 'Währung Kostenansatz', type: 'string' },
    { key: 'not_budget_relevant', label: 'Nicht budgetrelevant', type: 'boolean' },
    { key: 'grant_number', label: 'Förderkennzeichen', type: 'string' },
];

export function getPublicationFilterFieldDefinition(key: string): PublicationFilterFieldDefinition | undefined {
    return PUBLICATION_FILTER_FIELD_DEFINITIONS.find((field) => field.key === key || field.legacyKeys?.includes(key));
}

export function getPublicationFilterOperationsForType(type: PublicationFilterFieldType): CompareOperation[] {
    return PUBLICATION_FILTER_OPERATIONS_BY_TYPE[type] ?? [];
}

export function getPublicationFilterOperationsForKey(key: string): CompareOperation[] {
    const field = getPublicationFilterFieldDefinition(key);
    return field ? getPublicationFilterOperationsForType(field.type) : [];
}

export function isPublicationFilterOperationAllowed(key: string, operation: CompareOperation): boolean {
    return getPublicationFilterOperationsForKey(key).includes(operation);
}
