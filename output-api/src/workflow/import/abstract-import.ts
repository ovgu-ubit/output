import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { AppError, UpdateMapping, UpdateOptions } from '../../../../output-interfaces/Config';
import { Funder } from '../../funder/Funder.entity';
import { GreaterEntity } from '../../greater_entity/GreaterEntity.entity';
import { Publication } from '../../publication/core/Publication.entity';
import { Publisher } from '../../publisher/Publisher.entity';
import { ContractService } from '../../contract/contract.service';
import { FunderService } from '../../funder/funder.service';
import { GreaterEntityService } from '../../greater_entity/greater-entitiy.service';
import { InstituteService } from '../../institute/institute.service';
import { InvoiceService } from '../../invoice/invoice.service';
import { LanguageService } from '../../publication/lookups/language.service';
import { OACategoryService } from '../../oa_category/oa-category.service';
import { PublicationTypeService } from '../../pub_type/publication-type.service';
import { PublisherService } from '../../publisher/publisher.service';
import { RoleService } from '../../publication/relations/role.service';
import { Institute } from '../../institute/Institute.entity';
import { PublicationService } from '../../publication/core/publication.service';
import { Author } from '../../author/Author.entity';
import { AuthorService } from '../../author/author.service';
import { Invoice } from '../../invoice/Invoice.entity';
import { Role } from '../../publication/relations/Role.entity';
import { ReportItemService } from '../report-item.service';
import { AppConfigService } from '../../config/app-config.service';

export function ImportService(meta: { path: string }): ClassDecorator {
    return (target) => Reflect.defineMetadata("import_service", meta, target);
}
export function getImportServiceMeta(target: Function): { path: string } | undefined {
    return Reflect.getMetadata("import_service", target);
}

@Injectable()
/**
 * abstract class for all imports
 */
export abstract class AbstractImportService {

    constructor(protected publicationService: PublicationService, protected authorService: AuthorService,
        protected geService: GreaterEntityService, protected funderService: FunderService, protected publicationTypeService: PublicationTypeService,
        protected publisherService: PublisherService, protected oaService: OACategoryService, protected contractService: ContractService,
        protected reportService: ReportItemService, protected instService: InstituteService, protected languageService: LanguageService, protected roleService: RoleService,
        protected invoiceService: InvoiceService, protected configService: AppConfigService) { }

    protected progress = 0;
    protected status_text = 'initialized';
    protected report: string;
    protected dryRun = false;

    /**
     * Class indicating how to proceed with publication data fields in an update case:
     * - IGNORE: field is ignored and not changed
     * - REPLACE_IF_EMPTY: field replaces original value only if its empty
     * - REPLACE: field replaces original value always
     * - APPEND: field contents are added to original publication (if not applicable, is reduced to REPLACE_IF_EMPTY)
     */
    protected updateMapping: UpdateMapping = {
        author_inst: UpdateOptions.APPEND,
        authors: UpdateOptions.REPLACE_IF_EMPTY,
        title: UpdateOptions.IGNORE,
        pub_type: UpdateOptions.REPLACE_IF_EMPTY,
        oa_category: UpdateOptions.REPLACE_IF_EMPTY,
        greater_entity: UpdateOptions.REPLACE_IF_EMPTY,
        publisher: UpdateOptions.REPLACE_IF_EMPTY,
        contract: UpdateOptions.REPLACE_IF_EMPTY,
        funder: UpdateOptions.APPEND,
        doi: UpdateOptions.REPLACE_IF_EMPTY,
        pub_date: UpdateOptions.REPLACE_IF_EMPTY,
        link: UpdateOptions.REPLACE_IF_EMPTY,
        language: UpdateOptions.REPLACE_IF_EMPTY,
        license: UpdateOptions.REPLACE_IF_EMPTY,
        invoice: UpdateOptions.REPLACE_IF_EMPTY,
        status: UpdateOptions.IGNORE,
        abstract: UpdateOptions.REPLACE_IF_EMPTY,
        citation: UpdateOptions.REPLACE_IF_EMPTY,
        page_count: UpdateOptions.REPLACE_IF_EMPTY,
        peer_reviewed: UpdateOptions.REPLACE_IF_EMPTY,
        cost_approach: UpdateOptions.REPLACE_IF_EMPTY,
    };

    public getUpdateMapping() {
        return this.updateMapping;
    }
    public setUpdateMapping(map: UpdateMapping) {
        this.updateMapping = map;
    }

    public getName() {
        return this.name;
    }

    public abstract setReportingYear(year: string): void;

    /**
     * name of the import, is used for logging and as dataSource
     */
    protected name = 'import';
    /**
     * retrieves the total number of items based on a response object
     * @param response 
     */
    protected abstract getDOI(element: any): string;
    /**
     * retrieves the title of an element
     * @param element 
     */
    protected abstract getTitle(element: any): string;
    /**
     * test function if an element should be imported
     * @param element 
     */
    protected abstract importTest(element: any): boolean | Promise<boolean>;
    /**
     * retrieves the institutional authors of an element
     * @param element 
     */
    protected abstract getInstAuthors(element: any): { first_name: string, last_name: string, orcid?: string, affiliation?: string, corresponding?: boolean, role?: string }[];
    /**
     * retrieves the author string of an element
     * @param element 
     */
    protected abstract getAuthors(element: any): string;
    /**
     * retrieves the greater entitiy information of the element
     * @param element
     */
    protected abstract getGreaterEntity(element: any): GreaterEntity;
    /**
     * retrieves the publisher of an element
     * @param element
     */
    protected abstract getPublisher(element: any): Publisher;
    /**
     * retrieves the publication date of an element in UTC timezone
     * @param element 
     */
    protected abstract getPubDate(element: any): Date | { pub_date?: Date, pub_date_print?: Date, pub_date_accepted?: Date, pub_date_submitted?: Date };
    /**
     * retrieves the link of an element
     * @param element 
     */
    protected abstract getLink(element: any): string;
    /**
     * retrieves the language of an element
     * @param element
     */
    protected abstract getLanguage(element: any): string;
    /**
     * retrieves the funders of an element by label and doi
     * @param element
     */
    protected abstract getFunder(element: any): Funder[];
    /**
     * retrieves the publication type string of an element
     * @param element 
     */
    protected abstract getPubType(element: any): string;
    /**
     * retrieves the open access category string of an element
     * @param element 
     */
    protected abstract getOACategory(element: any): string | { oa_category?: string, is_oa?: string, oa_status?: string, is_journal_oa?: string, best_oa_host?: string };
    /**
     * retrieves the contract string of an element
     * @param element 
     */
    protected abstract getContract(element: any): string;
    /**
     * retrieves the license string of an element
     * @param element 
     */
    protected abstract getLicense(element: any): string;
    /**
     * retrieves the invoice information of an element
     * @param element 
     */
    protected abstract getInvoiceInformation(element: any): {
        number?: string, date?: Date, booking_date?: Date, booking_amount?: number, cost_center?: string,
        cost_items: { euro_value?: number, vat?: number, orig_value?: number, orig_currency?: string, cost_type?: string }[]
    }[];
    /**
     * retrieves the status number of an element
     * @param element 
     */
    protected abstract getStatus(element: any): number;
    /**
     * retrieves the abstract of an element
     * @param element 
     */
    protected abstract getAbstract(element: any): string;
    /**
     * retrieves a citation string of an element
     * @param element 
     */
    protected abstract getCitation(element: any): { volume?: string, issue?: string, first_page?: string, last_page?: string, publisher_location?: string, edition?: string, article_number?: string };
    /**
     * retrieves the page count of an element
     * @param element 
     */
    protected abstract getPageCount(element: any): number;
    /**
     * retrieves the peer reviewed status of an element
     * @param element 
     */
    protected abstract getPeerReviewed(element: any): boolean;
    /**
     * retrieves the cost approach number of an element
     * @param element 
     */
    protected abstract getCostApproach(element: any): number;

    /**
     * main method for import and updates, retrieves elements from API and saves the mapped entities to the DB
     */
    public abstract import(update: boolean, by_user?: string, dry_run?: boolean): void;

    /**
     * maps a retrieved element to a saved publication entity
     * @param item the JSON element for a single publication
     * @returns the persisted publication entity
     */
    async mapNew(item) {
        if (!(await this.importTest(item))) {
            this.reportService.write(this.report, { type: 'info', publication_doi: this.getDOI(item), publication_title: this.getTitle(item), timestamp: new Date(), origin: 'importTest', text: 'Publication not imported due to import test fail' })
            return null;
        }
        let remark = '';
        // process author objects
        const authors_entities: { author: Author, corresponding: boolean, affiliation: string, institute: Institute, role: Role }[] = [];
        const authors_inst = this.getInstAuthors(item);
        if (authors_inst) {
            for (const aut of authors_inst) {
                const res: { author: Author, error: AppError } = await this.authorService.findOrSave(aut.last_name?.trim(), aut.first_name?.trim(), aut.orcid?.trim(), aut.affiliation?.trim(), this.dryRun).catch(e => {
                    this.reportService.write(this.report, { type: 'warning', publication_doi: this.getDOI(item), publication_title: this.getTitle(item), timestamp: new Date(), origin: 'AuthorService', text: e['text'] ? e['text'] + (aut.corresponding ? ' (corr.)' : '') : e + (aut.corresponding ? ' (corr.)' : '') })
                    return { author: null, error: e }
                });
                //identify an institution from the affiliation string
                const inst = aut.affiliation?.trim() ? await firstValueFrom(this.instService.findOrSave(aut.affiliation?.trim(), this.dryRun)) : null;
                //identify a role from the author object, or assign "aut"
                const role = aut.role ? await this.roleService.findOrSave(aut.role?.trim(), this.dryRun) : await this.roleService.findOrSave('aut', this.dryRun); //default role author
                if (res.author) authors_entities.push({ author: res.author, corresponding: aut.corresponding, affiliation: aut.affiliation?.trim(), institute: inst, role });
                if (res.error?.text && res.error?.text.includes('mehrdeutig')) remark += res.error.text + '\n';
            }
        }
        //identify greater entity
        const ge = this.getGreaterEntity(item);
        let ge_ent = null;
        if (ge) ge_ent = await this.geService.findOrSave(ge, this.dryRun).catch(e => {
            this.reportService.write(this.report, { type: 'warning', publication_doi: this.getDOI(item), publication_title: this.getTitle(item), timestamp: new Date(), origin: 'GreaterEntityService', text: e['text'] ? e['text'] + ', must be assigned manually' : 'Unknown error' })
        })
        //identify funders
        const funders = this.getFunder(item);
        let funder_ents: Funder[] = []
        if (funders && Array.isArray(funder_ents)) {
            for (const funder of funders) {
                const funder_ent = await this.funderService.findOrSave(funder, this.dryRun).catch(e => {
                    this.reportService.write(this.report, { type: 'warning', publication_doi: this.getDOI(item), publication_title: this.getTitle(item), timestamp: new Date(), origin: 'FunderService', text: e['text'] ? e['text'] + ', must possibly be assigned manually' : 'Unknown error' })
                });
                if (funder_ent) funder_ents.push(funder_ent);
            }
            funder_ents = funder_ents.filter((v, i, s) => { return s.indexOf(s.find(f => f.id === v.id)) === i; });
        }
        //identify publication type
        const pub_type = await this.publicationTypeService.findOrSave(this.getPubType(item), this.dryRun);
        //identify publisher
        const publisher_obj = this.getPublisher(item);
        let publisher: Publisher;
        let publisher_ent;
        if (publisher_obj) {
            publisher_ent = await this.publisherService.findOrSave(publisher_obj, this.dryRun).catch(e => {
                this.reportService.write(this.report, { type: 'warning', publication_doi: this.getDOI(item), publication_title: this.getTitle(item), timestamp: new Date(), origin: 'PublisherService', text: e['text'] ? e['text'] + ', must possibly be assigned manually' : 'Unknown error' })
            });
        }
        if (!publisher_ent && this.getDOI(item)) publisher_ent = await this.publisherService.findByDOI(this.getDOI(item))
        if (publisher_ent) publisher = publisher_ent
        //identify oa category
        const oa = this.getOACategory(item);
        let oa_category;
        let is_oa;
        let oa_status;
        let is_journal_oa;
        let best_oa_host;
        if (typeof (oa) == "string") oa_category = await firstValueFrom(this.oaService.findOrSave(oa as string, this.dryRun)).catch(e => {
                this.reportService.write(this.report, { type: 'warning', publication_doi: this.getDOI(item), publication_title: this.getTitle(item), timestamp: new Date(), origin: 'OACategoryService', text: e['text'] ? e['text'] + ', must possibly be assigned manually' : 'Unknown error' })
            });
        else {
            oa_category = await firstValueFrom(this.oaService.findOrSave(oa["oa_category"], this.dryRun)).catch(e => {
                this.reportService.write(this.report, { type: 'warning', publication_doi: this.getDOI(item), publication_title: this.getTitle(item), timestamp: new Date(), origin: 'OACategoryService', text: e['text'] ? e['text'] + ', must possibly be assigned manually' : 'Unknown error' })
            });
            is_oa = oa["is_oa"];
            oa_status = oa["oa_status"];
            is_journal_oa = oa["is_journal_oa"];
            best_oa_host = oa["best_oa_host"];
        }
        //identify conctract
        const contract = await firstValueFrom(this.contractService.findOrSave(this.getContract(item), this.dryRun));
        //get invoice information
        const inv_info = this.getInvoiceInformation(item);
        //import of invoices
        const invoices: Invoice[] = [];
        if (inv_info) for (const inv of inv_info) {
            const cost_items = [];
            for (const ci of inv.cost_items) {
                cost_items.push({ euro_value: ci.euro_value, orig_value: ci.orig_value, orig_currency: ci.orig_currency, vat: ci.vat, cost_type: await firstValueFrom(this.invoiceService.findOrSaveCT(ci.cost_type, this.dryRun)) })
            }
            const cost_center = await firstValueFrom(this.invoiceService.findOrSaveCC(inv.cost_center, this.dryRun))
            invoices.push({
                number: inv.number,
                booking_amount: inv.booking_amount,
                booking_date: inv.booking_date,
                cost_center,
                cost_items,
                date: inv.date,
            })
        }
        //identify language
        const language = await this.languageService.findOrSave(this.getLanguage(item), this.dryRun);
        //identify publication date(s)
        const pub_date = this.getPubDate(item);
        //identify status
        let status = this.getStatus(item);
        if (!status) status = 0;

        const ca = this.getCostApproach(item);
        const cost_approach = Number.isNaN(ca) ? undefined : ca;

        let doi;
        const doi_a = this.publicationService.doi_regex.exec(this.getDOI(item)?.trim());
        if (doi_a) doi = doi_a[0];

        //construct publication object to save
        const obj: Publication = {
            authors: this.getAuthors(item)?.trim(),
            title: this.getTitle(item)?.trim().replace(/<\/?[\w\s="/.':;#-\/\?]+>/gi, ""),//remove html tags from input
            doi,
            link: this.getLink(item)?.trim(),
            language,
            pub_type,
            greater_entity: ge_ent as GreaterEntity,
            publisher,
            oa_category,
            contract,
            dataSource: this.name.trim(),
            funders: funder_ents,
            best_oa_license: this.getLicense(item)?.trim(),
            invoices,
            abstract: await this.configService.get('optional_fields')['abstract'] ? this.getAbstract(item)?.trim() : undefined,
            page_count: await this.configService.get('optional_fields')['page_count'] ? this.getPageCount(item) : undefined,
            peer_reviewed: await this.configService.get('optional_fields')['peer_reviewed'] ? this.getPeerReviewed(item) : undefined,
            status,
            add_info: remark,
            cost_approach,
            is_oa,
            oa_status,
            is_journal_oa,
            best_oa_host
        };
        //process publication date in case it is a complex object, dates are assigned to the publication
        if (!pub_date) {
            this.reportService.write(this.report, { type: 'warning', publication_doi: this.getDOI(item), publication_title: this.getTitle(item), timestamp: new Date(), origin: 'pub_date', text: 'Publication not imported since no pub_date was available' })
            return null;
        }
        if (pub_date instanceof Date) obj.pub_date = pub_date ? pub_date : undefined;
        else {
            if (pub_date.pub_date && !isNaN(pub_date.pub_date as any)) obj.pub_date = pub_date.pub_date;
            if (await this.configService.get('optional_fields')['pub_date_print'] && pub_date.pub_date_print && !isNaN(pub_date.pub_date_print as any)) obj.pub_date_print = pub_date.pub_date_print;
            if (pub_date.pub_date_accepted && !isNaN(pub_date.pub_date_accepted as any)) obj.pub_date_accepted = pub_date.pub_date_accepted;
            if (await this.configService.get('optional_fields')['pub_date_submitted'] && pub_date.pub_date_submitted && !isNaN(pub_date.pub_date_submitted as any)) obj.pub_date_submitted = pub_date.pub_date_submitted;
        }
        //process citation information
        const cit = this.getCitation(item);
        if (cit) {
            obj.volume = cit.volume;
            obj.issue = cit.issue;
            obj.first_page = cit.first_page;
            obj.last_page = cit.last_page;
        }
        if (!this.dryRun) {
            //save publication object and assign authorships
            const pub_ent = (await this.publicationService.save([obj]))[0];
            for (const aut of authors_entities) {
                await this.publicationService.saveAuthorPublication(aut.author, pub_ent, aut.corresponding, aut.affiliation, aut.institute, aut.role);
            }

            return pub_ent;
        } else return obj;
    }

    /**
     * maps an update
     * @param element the retrieved JSON element
     * @param orig the original publication from DB
     * @returns the updated publication entity or null if no update has been performed
     */
    async mapUpdate(element: any, orig: Publication): Promise<{ pub: Publication, fields: string[] }> {
        const fields = [];
        // all fields are processed according to the update mapping
        if (!orig.locked_author) switch (this.updateMapping.authors) {
            case UpdateOptions.IGNORE:
                break;
            case UpdateOptions.APPEND:
                const text = this.getAuthors(element);
                if (text) {
                    orig.authors += '|' + text;
                    fields.push('authors')
                }
                break;
            case UpdateOptions.REPLACE_IF_EMPTY:
                if (!orig.authors) {
                    orig.authors = this.getAuthors(element);
                    if (orig.authors) fields.push('authors')
                }
                break;
            case UpdateOptions.REPLACE:
                orig.authors = this.getAuthors(element);
                if (orig.authors) fields.push('authors')
                break;
        }

        switch (this.updateMapping.title) {
            case UpdateOptions.IGNORE:
                break;
            case UpdateOptions.APPEND:
                const text = this.getTitle(element);
                if (text) {
                    orig.title += '|' + text;
                    fields.push('title')
                }
                break;
            case UpdateOptions.REPLACE_IF_EMPTY:
                if (!orig.title) {
                    orig.title = this.getTitle(element);
                    if (orig.title) fields.push('title')
                }
                break;
            case UpdateOptions.REPLACE:
                orig.title = this.getTitle(element);
                if (orig.title) fields.push('title')
                break;
        }

        switch (this.updateMapping.doi) {
            case UpdateOptions.IGNORE:
                break;
            case UpdateOptions.APPEND:
                const text = this.getDOI(element);
                if (text) {
                    orig.doi += '|' + text;
                    fields.push('doi')
                }
                break;
            case UpdateOptions.REPLACE_IF_EMPTY:
                if (!orig.doi) {
                    orig.doi = this.getDOI(element);
                    if (orig.doi) fields.push('doi')
                }
                break;
            case UpdateOptions.REPLACE:
                orig.doi = this.getDOI(element);
                if (orig.doi) fields.push('doi')
                break;
        }

        switch (this.updateMapping.link) {
            case UpdateOptions.IGNORE:
                break;
            case UpdateOptions.APPEND:
                const text = this.getLink(element);
                if (text) {
                    orig.link += '|' + text;
                    fields.push('link')
                }
                break;
            case UpdateOptions.REPLACE_IF_EMPTY:
                if (!orig.link) {
                    orig.link = this.getLink(element);
                    if (orig.link) fields.push('link')
                }
                break;
            case UpdateOptions.REPLACE:
                orig.link = this.getLink(element);
                if (orig.link) fields.push('link')
                break;
        }

        if (!orig.locked_biblio) switch (this.updateMapping.language) {
            case UpdateOptions.IGNORE:
                break;
            case UpdateOptions.APPEND:
            case UpdateOptions.REPLACE_IF_EMPTY:
                if (!orig.language) {
                    orig.language = await this.languageService.findOrSave(this.getLanguage(element), this.dryRun);
                    if (orig.language) fields.push('language')
                }
                break;
            case UpdateOptions.REPLACE:
                orig.language = await this.languageService.findOrSave(this.getLanguage(element), this.dryRun);
                if (orig.language) fields.push('language')
                break;
        }
        let pd;
        if (!orig.locked_biblio) switch (this.updateMapping.pub_date) {
            case UpdateOptions.IGNORE:
                break;
            case UpdateOptions.REPLACE_IF_EMPTY://append is replace if empty
            case UpdateOptions.APPEND:
                pd = this.getPubDate(element);
                let flag = false;
                if (pd instanceof Date) {
                    if (!orig.pub_date || (orig.pub_date.getDate() === 1 && orig.pub_date.getMonth() === 0)) orig.pub_date = pd;
                    flag = true;
                } else if (pd) {
                    if (!orig.pub_date || (orig.pub_date.getDate() === 1 && orig.pub_date.getMonth() === 0)) {
                        orig.pub_date = pd.pub_date;
                        flag = true;
                    }
                    if (await this.configService.get('optional_fields')['pub_date_print'] && (!orig.pub_date_print || (orig.pub_date_print.getDate() === 1 && orig.pub_date_print.getMonth() === 0))) {
                        orig.pub_date_print = pd.pub_date_print;
                        flag = true;
                    }
                    if (!orig.pub_date_accepted || (orig.pub_date_accepted.getDate() === 1 && orig.pub_date_accepted.getMonth() === 0)) {
                        orig.pub_date_accepted = pd.pub_date_accepted;
                        flag = true;
                    }
                    if (await this.configService.get('optional_fields')['pub_date_submitted'] && (!orig.pub_date_submitted || (orig.pub_date_submitted.getDate() === 1 && orig.pub_date_submitted.getMonth() === 0))) {
                        orig.pub_date_submitted = pd.pub_date_submitted;
                        flag = true;
                    }
                }
                if (flag) fields.push('pub_dates')
                break;
            case UpdateOptions.REPLACE:
                pd = this.getPubDate(element);
                if (pd instanceof Date) {
                    orig.pub_date = pd;
                    flag = true;
                } else if (pd) {
                    if (pd.pub_date) {
                        orig.pub_date = pd.pub_date;
                        flag = true;
                    }
                    if (await this.configService.get('optional_fields')['pub_date_print'] && pd.pub_date_print) {
                        orig.pub_date_print = pd.pub_date_print;
                        flag = true;
                    }
                    if (pd.pub_date_accepted) {
                        orig.pub_date_accepted = pd.pub_date_accepted;
                        flag = true;
                    }
                    if (await this.configService.get('optional_fields')['pub_date_submitted'] && pd.pub_date_submitted) {
                        orig.pub_date_submitted = pd.pub_date_submitted;
                        flag = true;
                    }
                }

                if (flag) fields.push('pub_date')
                break;
        }

        if (!orig.locked_biblio) switch (this.updateMapping.pub_type) {
            case UpdateOptions.IGNORE:
                break;
            case UpdateOptions.REPLACE_IF_EMPTY://append is replace if empty
            case UpdateOptions.APPEND:
                if (!orig.pub_type) {
                    orig.pub_type = await this.publicationTypeService.findOrSave(this.getPubType(element), this.dryRun);
                    if (orig.pub_type) fields.push('pub_type')
                }
                break;
            case UpdateOptions.REPLACE:
                orig.pub_type = await this.publicationTypeService.findOrSave(this.getPubType(element), this.dryRun);
                if (orig.pub_type) fields.push('pub_type')
                break;
        }
        let publisher;
        if (!orig.locked_biblio) switch (this.updateMapping.publisher) {
            case UpdateOptions.IGNORE:
                break;
            case UpdateOptions.REPLACE_IF_EMPTY://append is replace if empty
            case UpdateOptions.APPEND:
                if (!orig.publisher) {
                    publisher = await this.getPublisher(element);
                    if (publisher) orig.publisher = await this.publisherService.findOrSave(publisher, this.dryRun);
                    if (orig.publisher) fields.push('publisher')
                }
                break;
            case UpdateOptions.REPLACE:
                publisher = await this.getPublisher(element);
                if (publisher) orig.publisher = await this.publisherService.findOrSave(publisher, this.dryRun);
                if (orig.publisher) fields.push('publisher')
                break;
        }

        if (!orig.locked_oa) {
            const oa = this.getOACategory(element);
            let oa_category;
            let is_oa;
            let oa_status;
            let is_journal_oa;
            let best_oa_host;
            if (typeof (oa) == "string") oa_category = await firstValueFrom(this.oaService.findOrSave(oa as string, this.dryRun));
            else {
                oa_category = await firstValueFrom(this.oaService.findOrSave(oa["oa_category"], this.dryRun));
                is_oa = oa["is_oa"];
                oa_status = oa["oa_status"];
                is_journal_oa = oa["is_journal_oa"];
                best_oa_host = oa["best_oa_host"];
            }
            switch (this.updateMapping.oa_category) {
                case UpdateOptions.IGNORE:
                    break;
                case UpdateOptions.REPLACE_IF_EMPTY://append is replace if empty
                case UpdateOptions.APPEND:
                    if (!orig.oa_category) {
                        orig.oa_category = oa_category;
                        if (orig.oa_category) fields.push('oa_category')
                    }
                    if (!orig.is_oa) {
                        orig.is_oa = is_oa;
                        if (orig.is_oa) fields.push('is_oa')
                    }
                    if (!orig.oa_status) {
                        orig.oa_status = oa_status;
                        if (orig.oa_status) fields.push('oa_status')
                    }
                    if (!orig.is_journal_oa) {
                        orig.is_journal_oa = is_journal_oa;
                        if (orig.is_journal_oa) fields.push('is_journal_oa')
                    }
                    if (!orig.best_oa_host) {
                        orig.best_oa_host = best_oa_host;
                        if (orig.best_oa_host) fields.push('best_oa_host')
                    }
                    break;
                case UpdateOptions.REPLACE:
                    orig.oa_category = oa_category;
                    if (orig.oa_category) fields.push('oa_category')
                    orig.is_oa = is_oa;
                    if (orig.is_oa) fields.push('is_oa')
                    orig.oa_status = oa_status;
                    if (orig.oa_status) fields.push('oa_status')
                    orig.is_journal_oa = is_journal_oa;
                    if (orig.is_journal_oa) fields.push('is_journal_oa')
                    orig.best_oa_host = best_oa_host;
                    if (orig.best_oa_host) fields.push('best_oa_host')
                    break;
            }
        }

        if (!orig.locked_biblio) if (this.updateMapping.greater_entity !== UpdateOptions.IGNORE && !(this.updateMapping.greater_entity === UpdateOptions.REPLACE_IF_EMPTY && orig.greater_entity !== null)) {
            const ge = this.getGreaterEntity(element);
            const ge_ent = await this.geService.findOrSave(ge, this.dryRun).catch(e => {
                this.reportService.write(this.report, { type: 'warning', publication_id: orig.id, timestamp: new Date(), origin: 'GreaterEntityService', text: `: ${e['text']} for publication ${orig.id}, must be assigned manually` })
            })
            if (ge_ent) {
                orig.greater_entity = ge_ent; //replace if not ignore or not empty (append is also replace if empty)
                fields.push('greater_entity')
            }
        }

        if (!orig.locked_finance) if (this.updateMapping.funder !== UpdateOptions.IGNORE && !(this.updateMapping.funder === UpdateOptions.REPLACE_IF_EMPTY && orig.funders !== null && orig.funders.length > 0)) {
            const funders = this.getFunder(element);
            let funder_ents: Funder[] = []
            if (funders) {
                for (const funder of funders) {
                    const funder_ent = await this.funderService.findOrSave(funder, this.dryRun).catch(e => {
                        this.reportService.write(this.report, { type: 'warning', publication_id: orig.id, timestamp: new Date(), origin: 'FunderService', text: `${e['text']} for publication ${orig.id}, must be checked manually` })
                    });
                    if (funder_ent) funder_ents.push(funder_ent);
                }
                funder_ents = funder_ents.filter((v, i, s) => { return s.indexOf(s.find(f => f.id === v.id)) === i; });
                if (this.updateMapping.funder === UpdateOptions.REPLACE) orig.funders = funder_ents;
                else if (this.updateMapping.funder === UpdateOptions.APPEND) {
                    if (!orig.funders) orig.funders = [];
                    funder_ents = funder_ents.filter(v => !orig.funders.find(e => e.id === v.id));
                    orig.funders.push(...funder_ents);
                }
                if (funder_ents !== null && funder_ents.length > 0) fields.push('funder')
            }
        }

        if (!orig.locked_author) if (this.updateMapping.author_inst !== UpdateOptions.IGNORE) {
            const existing_aut = await this.publicationService.getAuthorsPublication(orig);
            if (!(this.updateMapping.author_inst === UpdateOptions.REPLACE_IF_EMPTY && existing_aut.length === 0)) {
                const authors_entities: any[] = [];
                const authors_inst = this.getInstAuthors(element);
                if (authors_inst) {
                    for (const aut of authors_inst) {
                        const aut_ent = await this.authorService.findOrSave(aut.last_name, aut.first_name, aut.orcid, aut.affiliation, this.dryRun).catch(e => {
                            this.reportService.write(this.report, { type: 'warning', publication_id: orig.id, timestamp: new Date(), origin: 'AuthorService', text: e['text'] ? e['text'] + (aut.corresponding ? ' (corr.)' : '') : e + (aut.corresponding ? ' (corr.)' : '') })
                        });
                        const inst = aut.affiliation?.trim() ? await firstValueFrom(this.instService.findOrSave(aut.affiliation?.trim(), this.dryRun)) : null;
                        if (aut_ent) authors_entities.push({ author: aut_ent.author, corresponding: aut.corresponding, affiliation: aut.affiliation?.trim(), institute: inst });
                    }
                }
                if (this.updateMapping.author_inst === UpdateOptions.REPLACE) {
                    //delete existing author publication relationships
                    if (!this.dryRun) await this.publicationService.resetAuthorPublication(orig);
                }
                if (this.updateMapping.author_inst === UpdateOptions.APPEND) {
                    for (const aut of authors_entities) if (
                        !existing_aut.find(e => e.authorId === aut.author.id)) {
                        if (!this.dryRun) await this.publicationService.saveAuthorPublication(aut.author, orig, aut.corresponding, aut.affiliation, aut.institute);
                        fields.push('author_inst')
                    }
                }
            }
        }

        if (!orig.locked_finance) switch (this.updateMapping.invoice) {
            case UpdateOptions.IGNORE:
                break;
            case UpdateOptions.REPLACE_IF_EMPTY://append is replace if empty
                if (!orig.invoices || orig.invoices.length === 0) {
                    const inv_info = this.getInvoiceInformation(element);
                    //import of invoices
                    const invoices: Invoice[] = [];
                    if (inv_info && inv_info.length > 0) for (const inv of inv_info) {
                        const cost_items = [];
                        for (const ci of inv.cost_items) {
                            cost_items.push({ euro_value: ci.euro_value, orig_value: ci.orig_value, vat: ci.vat, orig_currency: ci.orig_currency, cost_type: await firstValueFrom(this.invoiceService.findOrSaveCT(ci.cost_type, this.dryRun)) })
                        }
                        const cost_center = await firstValueFrom(this.invoiceService.findOrSaveCC(inv.cost_center, this.dryRun))
                        invoices.push({
                            number: inv.number,
                            booking_amount: inv.booking_amount,
                            booking_date: inv.booking_date,
                            cost_center,
                            cost_items,
                            date: inv.date,
                        })
                    }
                    orig.invoices = invoices;
                    if (inv_info && inv_info.length > 0) fields.push('invoice')
                }
                break;
            case UpdateOptions.APPEND:
                if (!orig.invoices) orig.invoices = [];
                const inv_info1 = this.getInvoiceInformation(element);
                //import of invoices
                const invoices1 = [];
                for (const inv of inv_info1) {
                    const cost_items = [];
                    for (const ci of inv.cost_items) {
                        if (ci.cost_type.includes('DEAL Servicepauschale') && orig.invoices?.find(e => e.cost_items?.find(f => f.cost_type?.label.includes('DEAL Servicepauschale')))) continue;
                        cost_items.push({ euro_value: ci.euro_value, orig_value: ci.orig_value, vat: ci.vat, orig_currency: ci.orig_currency, cost_type: await firstValueFrom(this.invoiceService.findOrSaveCT(ci.cost_type, this.dryRun)) })
                    }
                    const cost_center = await firstValueFrom(this.invoiceService.findOrSaveCC(inv.cost_center, this.dryRun))
                    if (cost_items.length > 0) invoices1.push({
                        number: inv.number,
                        booking_amount: inv.booking_amount,
                        booking_date: inv.booking_date,
                        cost_center,
                        cost_items,
                        date: inv.date,
                    })
                }
                orig.invoices = orig.invoices.concat(invoices1);
                if (invoices1 && invoices1.length > 0) fields.push('invoice')
                break;
            case UpdateOptions.REPLACE:
                const inv_info2 = this.getInvoiceInformation(element);
                //import of invoices
                const invoices2 = [];
                for (const inv of inv_info2) {
                    const cost_items = [];
                    for (const ci of inv.cost_items) {
                        cost_items.push({ euro_value: ci.euro_value, orig_value: ci.orig_value, vat: ci.vat, orig_currency: ci.orig_currency, cost_type: await firstValueFrom(this.invoiceService.findOrSaveCT(ci.cost_type, this.dryRun)) })
                    }
                    const cost_center = await firstValueFrom(this.invoiceService.findOrSaveCC(inv.cost_center, this.dryRun))
                    invoices2.push({
                        number: inv.number,
                        booking_amount: inv.booking_amount,
                        booking_date: inv.booking_date,
                        cost_center,
                        cost_items,
                        date: inv.date,
                    })
                }
                if (inv_info2) orig.invoices = invoices2; else orig.invoices = [];
                fields.push('invoice')
                break;
        }
        if (!orig.locked_oa) switch (this.updateMapping.license) {
            case UpdateOptions.IGNORE:
                break;
            case UpdateOptions.APPEND:
            case UpdateOptions.REPLACE_IF_EMPTY:
                if (!orig.best_oa_license) {
                    orig.best_oa_license = this.getLicense(element);
                    if (orig.best_oa_license) fields.push('best_oa_license')
                }
                break;
            case UpdateOptions.REPLACE:
                orig.best_oa_license = this.getLicense(element);
                if (orig.best_oa_license) fields.push('best_oa_license')
                break;
        }
        switch (this.updateMapping.status) {
            case UpdateOptions.IGNORE:
                break;
            case UpdateOptions.REPLACE_IF_EMPTY://append is replace if empty
            case UpdateOptions.APPEND:
                if (!orig.status) {
                    orig.status = this.getStatus(element);
                    if (orig.status) fields.push('status')
                    else orig.status = 0;
                }
                break;
            case UpdateOptions.REPLACE:
                orig.status = this.getStatus(element);
                if (orig.status) fields.push('status')
                else orig.status = 0;
                break;
        }
        if (await this.configService.get('optional_fields')['abstract'] && !orig.locked_biblio) {
            switch (this.updateMapping.abstract) {
                case UpdateOptions.IGNORE:
                    break;
                case UpdateOptions.APPEND:
                case UpdateOptions.REPLACE_IF_EMPTY:
                    if (!orig.abstract) {
                        orig.abstract = this.getAbstract(element);
                        if (orig.abstract) fields.push('abstract')
                    }
                    break;
                case UpdateOptions.REPLACE:
                    orig.abstract = this.getAbstract(element);
                    if (orig.abstract) fields.push('abstract')
                    break;
            }
        }
        if (await this.configService.get('optional_fields')['citation'] && !orig.locked_biblio) {
            switch (this.updateMapping.citation) {
                case UpdateOptions.IGNORE:
                    break;
                case UpdateOptions.APPEND:
                case UpdateOptions.REPLACE_IF_EMPTY:
                    if (!orig.volume || !orig.issue || !orig.first_page || !orig.last_page) {
                        const cit = this.getCitation(element)
                        if (cit.volume) orig.volume = cit.volume;
                        if (cit.issue) orig.issue = cit.issue;
                        if (cit.first_page) orig.first_page = cit.first_page;
                        if (cit.last_page) orig.last_page = cit.last_page;
                        if (cit.volume || cit.issue || cit.first_page || cit.last_page) fields.push('citation')
                    }
                    break;
                case UpdateOptions.REPLACE:
                    const cit = this.getCitation(element)
                    orig.volume = cit.volume;
                    orig.issue = cit.issue;
                    orig.first_page = cit.first_page;
                    orig.last_page = cit.last_page;
                    if (cit) fields.push('citation')
                    break;
            }
        }
        if (await this.configService.get('optional_fields')['page_count'] && !orig.locked_biblio) {
            switch (this.updateMapping.page_count) {
                case UpdateOptions.IGNORE:
                    break;
                case UpdateOptions.APPEND:
                case UpdateOptions.REPLACE_IF_EMPTY:
                    if (!orig.page_count) {
                        orig.page_count = this.getPageCount(element);
                        if (orig.page_count) fields.push('page_count')
                    }
                    break;
                case UpdateOptions.REPLACE:
                    orig.page_count = this.getPageCount(element);
                    if (orig.page_count) fields.push('page_count')
                    break;
            }
        }
        if (await this.configService.get('optional_fields')['peer_reviewed'] && !orig.locked_biblio) {
            switch (this.updateMapping.peer_reviewed) {
                case UpdateOptions.IGNORE:
                    break;
                case UpdateOptions.APPEND:
                case UpdateOptions.REPLACE_IF_EMPTY:
                    if (!orig.peer_reviewed) {
                        orig.peer_reviewed = this.getPeerReviewed(element);
                        if (orig.peer_reviewed) fields.push('peer_reviewed')
                    }
                    break;
                case UpdateOptions.REPLACE:
                    orig.peer_reviewed = this.getPeerReviewed(element);
                    if (orig.peer_reviewed) fields.push('peer_reviewed')
                    break;
            }
        }

        switch (this.updateMapping.cost_approach) {
            case UpdateOptions.IGNORE:
                break;
            case UpdateOptions.APPEND:
                const text = this.getCostApproach(element);
                if (text && !Number.isNaN(text)) {
                    orig.cost_approach += text;
                    fields.push('cost_approach')
                }
                break;
            case UpdateOptions.REPLACE_IF_EMPTY:
                if (!orig.cost_approach) {
                    const ca = this.getCostApproach(element);
                    orig.cost_approach = Number.isNaN(ca) ? undefined : ca;
                    if (orig.cost_approach) fields.push('cost_approach')
                }
                break;
            case UpdateOptions.REPLACE:
                const ca = this.getCostApproach(element);
                orig.cost_approach = Number.isNaN(ca) ? undefined : ca;
                if (orig.cost_approach) fields.push('cost_approach')
                break;
        }
        const res = this.finalize(orig, element);
        orig = res.pub;
        fields.push(...res.fields)

        let pub_ent: Publication;
        if (fields.length > 0) {
            if (!this.dryRun) {
                pub_ent = (await this.publicationService.save([orig]))[0];
                return { pub: pub_ent, fields };
            } else return { pub: orig, fields }
        } else return { pub: orig, fields }
    }

    /**
     * final adaptions to updated publication object, however relations are already stored
     * @param orig 
     * @param element 
     */
    protected finalize(orig: Publication, element: any): { fields: string[], pub: Publication } {
        return { fields: [], pub: orig };
    }

    public status() {
        return {
            progress: this.progress,
            status: this.status_text
        };
    }
}