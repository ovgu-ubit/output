export interface PublicationIndex {
    id: number;
    title: string;
    doi: string;
    authors: string;
    authors_inst: string;
    corr_author: string;
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
    publication_type: string;
    contract: string;
    import_date: Date;
}

export interface AuthorIndex {
	id: number;
	first_name: string;
	last_name: string;
	orcid?: string;
	pub_count: number;
	pub_corr_count: number;
	institutes?: string;
}
export interface InstituteIndex {
	id: number;
	label: string;
	short_label?: string;
	author_count: number;
	author_count_total: number;
	pub_count: number;
	pub_corr_count: number;
	sub_inst_count: number;
}
export interface ContractIndex {
	id: number;
    publisher: string;
    label: string;
    start_date?: Date;
    end_date?: Date;
    invoice_amount?: number;
	pub_count: number;
}
export interface PublisherIndex {
    id?: number;
    label: string;
    location?: string;
	pub_count: number;
}
export interface GreaterEntityIndex {
	id?: number;
    label: string;
    rating?: string;
    is_doaj?: boolean;
    identifiers?: string;
	pub_count: number;
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
}
export interface OACategoryIndex {
    id?: number;
    label: string;
    is_oa: boolean;
	pub_count: number;
}