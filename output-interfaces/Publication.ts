import {AliasAuthorFirstName, AliasAuthorLastName, AliasFunder, AliasInstitute, AliasPublisher,AliasPubType} from './Alias'

export interface Publication {
    id?: number;
    authorPublications?: AuthorPublication[];
    pub_type?: PublicationType
    oa_category?: OA_Category
    greater_entity?: GreaterEntity
    publisher?: Publisher
    contract?: Contract
    funders?: Funder[]
    invoices?: Invoice[]
    authors?: string;
    title?: string;
    doi?: string;
    pub_date?: Date;
    pub_date_print?: Date;
    pub_date_accepted?: Date;
    pub_date_submitted?: Date;
    link?: string;
    dataSource?: string;
    language?: Language;
    second_pub?: string;
    add_info?: string;
    import_date?: Date;
    edit_date?: Date;
    delete_date?: Date;
    locked?: boolean
    locked_author?: boolean
    locked_biblio?: boolean
    locked_finance?: boolean
    locked_oa?: boolean
    status?: number
    is_oa?: boolean;
    oa_status?: string;
    is_journal_oa?: boolean;
    best_oa_host?: string;
    best_oa_license?: string;
    opus_share_it?: string;
    locked_at?: Date;
    abstract?: string;
    page_count?: number;
    peer_reviewed?: boolean;
    identifiers?: PublicationIdentifier[];
    volume?: string;
    issue?: string;
    first_page?: string;
    last_page?: string;
    cost_approach?: number;
}

export interface Author {
    id?: number;
    first_name: string;
    last_name: string;
    title?: string;
    institutes?: Institute[]
    orcid?: string;
    gnd_id?: string;
    valid_from?: Date;
    authorPublications?: AuthorPublication[];
    locked_at?: Date;
    aliases_first_name?: AliasAuthorFirstName[];
    aliases_last_name?: AliasAuthorLastName[];
}

export interface AuthorPublication {
    author?: Author
    authorId?: number
    publication?: Publication
    publicationId?: number
    institute?: Institute
    corresponding?: boolean;
    affiliation?: string;
}

export interface Role {
    id?: number;
    label: string;
    locked_at?: Date;
}

export interface Contract {
    id?: number;
    publisher: Publisher
    label: string;
    start_date?: Date;
    end_date?: Date;
    internal_number?: string;
    invoice_amount?: number;
    invoice_information?: string;
    sec_pub?: string;
    gold_option?: string;
    verification_method?: string;
	publications?: Publication[];
    identifiers?:ContractIdentifier[];
    locked_at?: Date;
}

export interface CostCenter {
    id?: number;
    number?: string;
    label?: string;
    locked_at?: Date;
}

export interface CostItem {
    id?: number;
    label?: string;
    invoice?: Invoice
    cost_type?: CostType
    euro_value?: number;
    orig_value?: number;
    orig_currency?: string;
    normal_price?: number;
    vat?: number;
}

export interface CostType{
    id?: number;
    label: string;
    locked_at?: Date;
}

export interface Funder {
    id?: number;
    label: string;
    doi?: string;
    ror_id?: string;
    publications?: Publication[];
    aliases?: AliasFunder[];
    locked_at?: Date;
}

export interface GreaterEntity {
    id?: number;
    label: string;
    rating?: string;
    doaj_since?: Date;
    doaj_until?: Date;
    identifiers?: Identifier[];
    publications?: Publication[]
    locked_at?: Date;
}

export interface Identifier {
    id?: number;
    type: string;
    value: string;
    entity?: GreaterEntity
}

export interface PublicationIdentifier {
    id?: number;
    type: string;
    value: string;
    publication?: Publication;
}

export interface ContractIdentifier {
    id?: number;
    type: string;
    value: string;
    contract?: Contract
}

export interface Institute {
    id?: number;
    super_institute?: Institute
	sub_institutes?: Institute[]
    label: string;
    short_label?: string;
	authors?: Author[];
	authorPublications?: AuthorPublication[];
    aliases?: AliasInstitute[];
    locked_at?: Date;
}

export interface Invoice {
    id?: number;
    cost_center?: CostCenter
    cost_items?: CostItem[]
    publication?: Publication
    number?: string;
    date?: Date;
    booking_date?: Date;
    booking_amount?: number;
}

export interface OA_Category {
    id?: number;
    label: string;
    is_oa: boolean;
    locked_at?: Date;
}

export interface PublicationType {
    id?: number;
    label: string;
    review: boolean;
    aliases?: AliasPubType[];
    locked_at?: Date;
}

export interface Publisher {
    id?: number;
    label: string;
    doi_prefixes?: PublisherDOI[];
    aliases?: AliasPublisher[];
    locked_at?: Date;
}

export interface PublisherDOI {
    publisher?: Publisher;
    publisherId?: number;
    doi_prefix: string;
}

export interface Language {
    id?: number;
    label: string;
}

export interface Status {
    id?: number;
    label: string;
    description?: string;
    locked_at?: Date;
}