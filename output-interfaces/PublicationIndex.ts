import { InvoiceCounts } from './InvoiceIndex';
import { IndexPage, IndexPageRequest } from './IndexPage';
import { SearchFilter } from './Config';

export const PUBLICATION_INDEX_COLUMNS = [
    'id', 'locked', 'title', 'doi', 'authors', 'authors_inst', 'corr_author', 'corr_inst',
    'greater_entity', 'publisher', 'pub_date', 'link', 'data_source', 'edit_date', 'status',
    'oa_category', 'pub_type', 'contract', 'net_costs', 'import_date', 'locked_status',
] as const;
export type PublicationIndexColumn = typeof PUBLICATION_INDEX_COLUMNS[number];

export interface PublicationIndex {
    id: number;
    title: string;
    doi: string;
    authors: string;
    authors_inst: string;
    corr_author: string;
    corr_inst?: string;
    /** Legacy name retained for source compatibility; the API field is corr_inst. */
    corr_institute: string;
    greater_entity: string;
    publisher: string;
    pub_date: string;
    link: string;
    data_source: string;
    edit_date: Date;
    locked: boolean;
    status: number;
    oa_category: string;
    pub_type?: string;
    /** Legacy name retained for source compatibility; the API field is pub_type. */
    publication_type: string;
    contract: string;
    /** Gross costs: booking amount per invoice, otherwise items including VAT. Legacy field name. */
    net_costs?: number;
    import_date: Date;
    locked_status?: string;
}

export interface PublicationIndexPageRequest extends IndexPageRequest<PublicationIndexColumn> {
    reporting_year?: number | null;
    all_reporting_years?: boolean;
    soft?: boolean;
    filter?: SearchFilter;
    paths?: string[];
}

export type PublicationIndexPage = IndexPage<PublicationIndex>;

export interface AuthorIndex {
	id: number;
	first_name: string;
	last_name: string;
	orcid?: string;
	pub_count: number;
	pub_count_corr: number;
    pub_count_total: number;
    /** Gross costs: booking amount per invoice, otherwise items including VAT. Legacy field name. */
    net_costs?: number;
	institutes?: string;
}
export interface InstituteIndex {
	id: number;
	label: string;
	short_label?: string;
    opus_id?: string;
	author_count: number;
	author_count_total: number;
	pub_count: number;
	pub_count_corr: number;
    /** Gross costs: booking amount per invoice, otherwise items including VAT. Legacy field name. */
    net_costs?: number;
	sub_inst_count: number;
}
export interface ContractIndex extends Partial<InvoiceCounts> {
	id: number;
    publisher: string;
    label: string;
    start_date?: Date;
    end_date?: Date;
    invoice_amount?: number;
	pub_count: number;
    /** Gross costs: booking amount per invoice, otherwise items including VAT. Legacy field name. */
    net_costs?: number;
    pub_count_total: number;
}
export interface PublisherIndex {
    id?: number;
    label: string;
    location?: string;
	pub_count: number;
    pub_count_total: number;
}
export interface GreaterEntityIndex {
	id?: number;
    label: string;
    rating?: string;
    is_doaj?: boolean;
    identifiers?: string;
	pub_count: number;
    pub_count_total: number;
}
export interface FunderIndex {
    id?: number;
    label: string;
    doi?: string;
	pub_count: number;
}
export interface PublicationTypeIndex {
    id?: number;
    label: string;
    review: boolean;
	pub_count: number;
    /** Gross costs: booking amount per invoice, otherwise items including VAT. Legacy field name. */
    net_costs?: number;
    pub_count_total: number;
}
export interface OACategoryIndex {
    id?: number;
    label: string;
    is_oa: boolean;
	pub_count: number;
    /** Gross costs: booking amount per invoice, otherwise items including VAT. Legacy field name. */
    net_costs?: number;
    pub_count_total: number;
}
export interface CostCenterIndex extends Partial<InvoiceCounts> {
    id?: number;
    number?: string;
    label: string;
	pub_count: number;
    /** Gross costs: booking amount per invoice, otherwise items including VAT. Legacy field name. */
    net_costs?: number;
    pub_count_total: number;
}
export interface CostTypeIndex extends Partial<InvoiceCounts> {
    id?: number;
    label: string;
	pub_count: number;
    /** Gross costs: booking amount per invoice, otherwise items including VAT. Legacy field name. */
    net_costs?: number;
    pub_count_total: number;
}
