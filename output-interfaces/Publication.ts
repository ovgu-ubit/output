import {Aliasable, AliasAuthorFirstName, AliasAuthorLastName, AliasFunder, AliasInstitute, AliasPublisher,AliasPubType} from './Alias'

export interface Entity {
    id?: number;
    locked_at?: Date;
    doi_prefixes?
    label?: string;
}

export interface Identifiable<T> extends Entity{
    identifiers?: IIdentifier<T>[]
}

export interface Publication extends Identifiable<Publication> {
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
    role?: Role;
}

export interface Role extends Entity {
    label: string;
}

export interface Contract extends Identifiable<Contract> {
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

export interface Funder extends Entity, Aliasable<Funder> {
    label: string;
    doi?: string;
    ror_id?: string;
    publications?: Publication[];
}

export interface GreaterEntity extends Identifiable<GreaterEntity>{
    label: string;
    rating?: string;
    doaj_since?: Date;
    doaj_until?: Date;
    publications?: Publication[]
}

export interface IIdentifier<T> extends Entity {
    type: string;
    value: string;
    entity?: T
}

export interface Identifier extends IIdentifier<GreaterEntity> {
}

export interface PublicationIdentifier extends IIdentifier<Publication> {
}

export interface ContractIdentifier extends IIdentifier<Contract> {
}

export interface Institute extends Entity, Aliasable<Institute> {
    super_institute?: Institute
	sub_institutes?: Institute[]
    label: string;
    short_label?: string;
	authors?: Author[];
	authorPublications?: AuthorPublication[];
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

export interface PublicationType extends Entity, Aliasable<PublicationType> {
    label: string;
    review: boolean;
}

export interface Publisher extends Entity, Aliasable<Publisher> {
    label: string;
    doi_prefixes?: PublisherDOI[];
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