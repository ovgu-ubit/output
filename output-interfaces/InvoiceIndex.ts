import { InvoiceKind } from './Publication';
import { IndexPage } from './IndexPage';

export type InvoiceIndexEntityFilter = 'contract_id' | 'cost_center_id' | 'cost_type_id';

export interface InvoiceCounts {
    /** Distinct invoices by invoice date in the reporting year, or with no invoice date. */
    invoice_count: number;
    /** All distinct invoices, including pre-invoices and invoices without a date. */
    invoice_count_total: number;
}

export const INVOICE_CONTEXTS = ['publication', 'contract_component', 'both', 'unassigned'] as const;
export type InvoiceContext = typeof INVOICE_CONTEXTS[number];

export const INVOICE_INDEX_SORT_FIELDS = [
    'id', 'number', 'date', 'booking_date', 'invoice_kind', 'cost_center',
    'net_amount_eur', 'vat_amount_eur', 'gross_amount_eur', 'booking_amount', 'costs_eur', 'item_count',
] as const;
export type InvoiceIndexSortField = typeof INVOICE_INDEX_SORT_FIELDS[number];

/** A read-only projection of one persisted invoice. Dates are ISO strings on the wire. */
export interface InvoiceIndex {
    id: number;
    invoice_kind: InvoiceKind;
    number: string | null;
    date: string | null;
    booking_date: string | null;
    booking_amount: number | null;
    /** Booking amount, otherwise the sum of positions including VAT; missing values count as zero. */
    costs_eur: number;

    item_count: number;
    cost_type_ids: number[];
    cost_type_labels: string[];
    /** A sum is null when there are no positions or any required position value is missing. */
    net_amount_eur: number | null;
    vat_amount_eur: number | null;
    gross_amount_eur: number | null;
    missing_amount_item_count: number;

    cost_center_id: number | null;
    cost_center_number: string | null;
    cost_center_label: string | null;
    publication_id: number | null;
    publication_title: string | null;
    publication_doi: string | null;
    publication_deleted: boolean;
    contract_component_id: number | null;
    contract_component_label: string | null;
    publication_contract_id: number | null;
    publication_contract_label: string | null;
    component_contract_id: number | null;
    component_contract_label: string | null;
    contract_conflict: boolean;
    context: InvoiceContext;
}

export interface InvoiceIndexQuery {
    page?: number;
    page_size?: number;
    sort?: InvoiceIndexSortField;
    sort_dir?: 'asc' | 'desc';
    q?: string;
    invoice_kind?: InvoiceKind;
    invoice_year?: number;
    booking_year?: number;
    /** Year of publication.pub_date; independent of invoice and booking year. */
    publication_year?: number;
    invoice_date_missing?: boolean;
    /** Date-only bounds (YYYY-MM-DD), both inclusive. */
    date_from?: string;
    date_to?: string;
    booking_date_from?: string;
    booking_date_to?: string;
    publication_id?: number;
    cost_center_id?: number;
    cost_type_id?: number;
    /** Matches either the publication contract or the component contract. */
    contract_id?: number;
    contract_component_id?: number;
    context?: InvoiceContext;
}

export interface InvoiceIndexPage extends IndexPage<InvoiceIndex> { }
