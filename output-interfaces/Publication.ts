import {AliasAuthorFirstName, AliasAuthorLastName, AliasFunder, AliasInstitute, AliasPublisher,AliasPubType} from './Alias'

export interface Entity {
    id?: number;
    locked_at?: Date;
    aliases?
    identifiers?
}

export interface Publication extends Entity {
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

export interface Author extends Entity {
    first_name: string;
    last_name: string;
    title?: string;
    institutes?: Institute[]
    orcid?: string;
    gnd_id?: string;
    valid_from?: Date;
    authorPublications?: AuthorPublication[];
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

export interface Role extends Entity {
    label: string;
}

export interface Contract extends Entity {
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
}

export interface CostCenter extends Entity {
    number?: string;
    label?: string;
}

export interface CostItem extends Entity {
    label?: string;
    invoice?: Invoice
    cost_type?: CostType
    euro_value?: number;
    orig_value?: number;
    orig_currency?: string;
    normal_price?: number;
    vat?: number;
}

export interface CostType extends Entity {
    label: string;
}

export interface Funder extends Entity {
    label: string;
    doi?: string;
    ror_id?: string;
    publications?: Publication[];
    aliases?: AliasFunder[];
}

export interface GreaterEntity extends Entity {
    label: string;
    rating?: string;
    doaj_since?: Date;
    doaj_until?: Date;
    identifiers?: Identifier[];
    publications?: Publication[]
}

export interface Identifier extends Entity {
    type: string;
    value: string;
    entity?: GreaterEntity
}

export interface PublicationIdentifier extends Entity {
    type: string;
    value: string;
    publication?: Publication;
}

export interface ContractIdentifier extends Entity {
    type: string;
    value: string;
    contract?: Contract
}

export interface Institute extends Entity {
    super_institute?: Institute
	sub_institutes?: Institute[]
    label: string;
    short_label?: string;
	authors?: Author[];
	authorPublications?: AuthorPublication[];
    aliases?: AliasInstitute[];
}

export interface Invoice extends Entity {
    cost_center?: CostCenter
    cost_items?: CostItem[]
    publication?: Publication
    number?: string;
    date?: Date;
    booking_date?: Date;
    booking_amount?: number;
}

export interface OA_Category extends Entity {
    label: string;
    is_oa: boolean;
}

export interface PublicationType extends Entity {
    label: string;
    review: boolean;
    aliases?: AliasPubType[];
}

export interface Publisher extends Entity {
    label: string;
    doi_prefixes?: PublisherDOI[];
    aliases?: AliasPublisher[];
}

export interface PublisherDOI {
    publisher?: Publisher;
    publisherId?: number;
    doi_prefix: string;
}

export interface Language extends Entity {
    label: string;
}

export interface Status extends Entity {
    label: string;
    description?: string;
}