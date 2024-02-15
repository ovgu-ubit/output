import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { Author } from '../../entity/Author';
import { Funder } from '../../entity/Funder';
import { GreaterEntity } from '../../entity/GreaterEntity';
import { Identifier } from '../../entity/Identifier';
import { Invoice } from '../../entity/Invoice';
import { Publication } from '../../entity/Publication';
import { AuthorService } from '../entities/author.service';
import { ContractService } from '../entities/contract.service';
import { CostTypeService } from '../entities/cost-type.service';
import { FunderService } from '../entities/funder.service';
import { GreaterEntityService } from '../entities/greater-entitiy.service';
import { OACategoryService } from '../entities/oa-category.service';
import { PublicationTypeService } from '../entities/publication-type.service';
import { PublicationService } from '../entities/publication.service';
import { PublisherService } from '../entities/publisher.service';
import { ReportItemService } from '../report-item.service';
import { Institute } from '../../entity/Institute';
import { InstitutionService } from '../entities/institution.service';
import { UpdateMapping, UpdateOptions } from '../../../../output-interfaces/Config';
import { LanguageService } from '../entities/language.service';

@Injectable()
/**
 * abstract class for all imports
 */
export abstract class AbstractImportService {

    constructor(protected publicationService: PublicationService, protected authorService: AuthorService,
        protected geService: GreaterEntityService, protected funderService: FunderService, protected publicationTypeService: PublicationTypeService,
        protected publisherService: PublisherService, protected oaService: OACategoryService, protected contractService: ContractService, protected costTypeService: CostTypeService,
        protected reportService: ReportItemService, protected instService: InstitutionService, protected languageService:LanguageService) { }

    protected progress = 0;
    protected status_text = 'initialized';
    protected report: string;

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
    };

    public getUpdateMapping() {
        return this.updateMapping;
    }
    public setUpdateMapping(map:UpdateMapping) {
        this.updateMapping = map;
    }

    public getName() {
        return this.name;
    }

    public abstract setReportingYear(year: string):void;

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
    protected abstract importTest(element: any): boolean;
    /**
     * retrieves the institutional authors of an element
     * @param element 
     */
    protected abstract getInstAuthors(element: any): { first_name: string, last_name: string, orcid?: string, affiliation?: string, corresponding?: boolean }[];
    /**
     * retrieves the author string of an element
     * @param element 
     */
    protected abstract getAuthors(element: any): string;
    /**
     * retrieves the identifier for the greater entity of the element
     * @param element
     */
    protected abstract getGreaterEntityIdentifier(element: any): Identifier[];
    /**
     * retrieves the name of the greater entitiy of the element
     * @param element
     */
    protected abstract getGreaterEntityName(element: any): string;
    /**
     * retrieves the publisher of an element
     * @param element
     */
    protected abstract getPublisher(element: any): string;
    /**
     * retrieves the publication date of an element in UTC timezone
     * @param element 
     */
    protected abstract getPubDate(element: any): Date;
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
    protected abstract getOACategory(element: any): string;
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
    protected abstract getInvoiceInformation(element: any): Invoice[];
    /**
     * retrieves the invoice information of an element
     * @param element 
     */
    protected abstract getStatus(element: any): number;

    /**
     * main method for import and updates, retrieves elements from API and saves the mapped entities to the DB
     */
    public abstract import(update: boolean, by_user?: string): void;

    /**
     * maps a retrieved element to a saved publication entity
     * @param item the JSON element for a single publication
     * @returns the persisted publication entity
     */
    async mapNew(item) {
        if (!this.importTest(item)) return null;

        let authors_entities: { author: Author, corresponding: boolean, affiliation: string, institute: Institute }[] = [];
        let authors_inst = this.getInstAuthors(item);
        if (authors_inst) {
            for (let aut of authors_inst) {
                let aut_ent = await this.authorService.findOrSave(aut.last_name.trim(), aut.first_name.trim(), aut.orcid?.trim(), aut.affiliation?.trim()).catch(e => {
                    this.reportService.write(this.report, { type: 'warning', publication_doi: this.getDOI(item), publication_title: this.getTitle(item), timestamp: new Date(), origin: 'AuthorService', text: e['text'] ? e['text'] + (aut.corresponding ? ' (corr.)' : '') : e + (aut.corresponding ? ' (corr.)' : '') })
                  });
                let inst = aut.affiliation?.trim() ? await firstValueFrom(this.instService.findOrSave(aut.affiliation?.trim())) : null;
                if (aut_ent) authors_entities.push({ author: aut_ent, corresponding: aut.corresponding, affiliation: aut.affiliation?.trim(),institute: inst });
            }
        }
        let ids = this.getGreaterEntityIdentifier(item);
        let ge = await this.geService.findOrSave(this.getGreaterEntityName(item), ids).catch(e => {
            this.reportService.write(this.report, { type: 'warning', publication_doi: this.getDOI(item), publication_title: this.getTitle(item), timestamp: new Date(), origin: 'GreaterEntityService', text: e['text'] ? e['text'] + ', must be assigned manually' : 'Unknown error'})
        })

        let funders = this.getFunder(item);
        let funder_ents: Funder[] = []
        if (funders) {
            for (let funder of funders) {
                let funder_ent = await this.funderService.findOrSave(funder.label, funder.doi).catch(e => {
                    this.reportService.write(this.report, { type: 'warning', publication_doi: this.getDOI(item), publication_title: this.getTitle(item), timestamp: new Date(), origin: 'FunderService', text: e['text'] ? e['text'] + ', must possibly be assigned manually' : 'Unknown error'})
                });
                if (funder_ent) funder_ents.push(funder_ent);
            }
            funder_ents = funder_ents.filter((v, i, s) => { return s.indexOf(s.find(f => f.id === v.id)) === i; });
        }
        let pub_type = await this.publicationTypeService.findOrSave(this.getPubType(item));
        let publisher = await firstValueFrom(this.publisherService.findOrSave(this.getPublisher(item)));
        let oa_category = await firstValueFrom(this.oaService.findOrSave(this.getOACategory(item)));
        let contract = await firstValueFrom(this.contractService.findOrSave(this.getContract(item)));

        let inv_info = this.getInvoiceInformation(item);
        /*let cost_items = [];
        if (inv_info) for (let inv_info_elem of inv_info) {
            if (inv_info_elem.currency === 'EUR') cost_items.push({ euro_value: inv_info_elem.price, orig_value: inv_info_elem.price, orig_currency: inv_info_elem.currency, cost_type: await firstValueFrom(this.costTypeService.findOrSave(inv_info_elem.cost_type)) })
            else cost_items.push({ orig_value: inv_info_elem.price, orig_currency: inv_info_elem.currency, cost_type: await firstValueFrom(this.costTypeService.findOrSave(inv_info_elem.cost_type)) })
        }*/

        let language = await this.languageService.findOrSave(this.getLanguage(item));

        let pub_date = this.getPubDate(item);

        let obj: Publication = {
            authors: this.getAuthors(item)?.trim(),
            title: this.getTitle(item)?.trim(),
            doi: this.getDOI(item)?.trim(),
            link: this.getLink(item)?.trim(),
            language,
            pub_type,
            greater_entity: ge as GreaterEntity,
            publisher,
            oa_category,
            contract,
            dataSource: this.name.trim(),
            pub_date,
            funders: funder_ents,
            best_oa_license: this.getLicense(item)?.trim(),
            invoices: inv_info
        };
        let pub_ent = (await this.publicationService.save([obj]))[0];
        for (let aut of authors_entities) {
            await this.publicationService.saveAuthorPublication(aut.author, pub_ent, aut.corresponding, aut.affiliation, aut.institute);
        }

        return pub_ent;
    }

    /**
     * maps an update
     * @param element the retrieved JSON element
     * @param orig the original publication from DB
     * @returns the updated publication entity or null if no update has been performed
     */
    async mapUpdate(element: any, orig: Publication): Promise<{pub:Publication, fields:string[]}> {
        let fields = [];

        switch (this.updateMapping.authors) {
            case UpdateOptions.IGNORE:
                break;
            case UpdateOptions.APPEND:
                let text = this.getAuthors(element);
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
                let text = this.getTitle(element);
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
                let text = this.getDOI(element);
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
                let text = this.getLink(element);
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

        switch (this.updateMapping.language) {
            case UpdateOptions.IGNORE:
                break;
            case UpdateOptions.APPEND:
            case UpdateOptions.REPLACE_IF_EMPTY:
                if (!orig.language) {
                    orig.language = await this.languageService.findOrSave(this.getLanguage(element));
                    if (orig.language) fields.push('language')
                }
                break;
            case UpdateOptions.REPLACE:
                orig.language = await this.languageService.findOrSave(this.getLanguage(element));
                if (orig.language) fields.push('language')
                break;
        }

        switch (this.updateMapping.pub_date) {
            case UpdateOptions.IGNORE:
                break;
            case UpdateOptions.REPLACE_IF_EMPTY://append is replace if empty
            case UpdateOptions.APPEND:
                if (!orig.pub_date) {
                    orig.pub_date = this.getPubDate(element);
                    if (orig.pub_date) fields.push('pub_date')
                }
                break;
            case UpdateOptions.REPLACE:
                orig.pub_date = this.getPubDate(element);
                if (orig.pub_date) fields.push('pub_date')
                break;
        }

        switch (this.updateMapping.pub_type) {
            case UpdateOptions.IGNORE:
                break;
            case UpdateOptions.REPLACE_IF_EMPTY://append is replace if empty
            case UpdateOptions.APPEND:
                if (!orig.pub_type) {
                    orig.pub_type = await this.publicationTypeService.findOrSave(this.getPubType(element));
                    if (orig.pub_type) fields.push('pub_type')
                }
                break;
            case UpdateOptions.REPLACE:
                orig.pub_type = await this.publicationTypeService.findOrSave(this.getPubType(element));
                if (orig.pub_type) fields.push('pub_type')
                break;
        }

        switch (this.updateMapping.publisher) {
            case UpdateOptions.IGNORE:
                break;
            case UpdateOptions.REPLACE_IF_EMPTY://append is replace if empty
            case UpdateOptions.APPEND:
                if (!orig.publisher) {
                    orig.publisher = await firstValueFrom(this.publisherService.findOrSave(this.getPublisher(element)));
                    if (orig.publisher) fields.push('publisher')
                }
                break;
            case UpdateOptions.REPLACE:
                orig.publisher = await firstValueFrom(this.publisherService.findOrSave(this.getPublisher(element)));
                if (orig.publisher) fields.push('publisher')
                break;
        }

        switch (this.updateMapping.oa_category) {
            case UpdateOptions.IGNORE:
                break;
            case UpdateOptions.REPLACE_IF_EMPTY://append is replace if empty
            case UpdateOptions.APPEND:
                if (!orig.oa_category) {
                    orig.oa_category = await firstValueFrom(this.oaService.findOrSave(this.getOACategory(element)));
                    if (orig.oa_category) fields.push('oa_category')
                }
                break;
            case UpdateOptions.REPLACE:
                orig.oa_category = await firstValueFrom(this.oaService.findOrSave(this.getOACategory(element)));
                if (orig.oa_category) fields.push('oa_category')
                break;
        }

        if (this.updateMapping.greater_entity !== UpdateOptions.IGNORE && !(this.updateMapping.greater_entity === UpdateOptions.REPLACE_IF_EMPTY && orig.greater_entity !== null)) {
            let ids = this.getGreaterEntityIdentifier(element);
            let ge = await this.geService.findOrSave(this.getGreaterEntityName(element), ids).catch(e => console.log(`GreaterEntityService: ${e['text']} for publication ${orig.id}, must be assigned manually`))
            if (ge) {
                orig.greater_entity = ge; //replace if not ignore or not empty (append is also replace if empty)
                fields.push('greater_entity')
            }
        }

        if (this.updateMapping.funder !== UpdateOptions.IGNORE && !(this.updateMapping.funder === UpdateOptions.REPLACE_IF_EMPTY && orig.funders !== null && orig.funders.length > 0)) {
            let funders = this.getFunder(element);
            let funder_ents: Funder[] = []
            if (funders) {
                for (let funder of funders) {
                    let funder_ent = await this.funderService.findOrSave(funder.label, funder.doi).catch(e => console.log(`FunderService: ${e['text']} for publication ${orig.id}, must be checked manually`));;
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

        if (this.updateMapping.author_inst !== UpdateOptions.IGNORE) {
            let existing_aut = await this.publicationService.getAuthorsPublication(orig);
            if (!(this.updateMapping.author_inst === UpdateOptions.REPLACE_IF_EMPTY && existing_aut.length === 0)) {
                let authors_entities: any[] = [];
                let authors_inst = this.getInstAuthors(element);
                if (authors_inst) {
                    for (let aut of authors_inst) {
                        let aut_ent = await this.authorService.findOrSave(aut.last_name, aut.first_name, aut.orcid, aut.affiliation).catch(e => {
                            this.reportService.write(this.report, { type: 'warning', publication_id: orig.id, timestamp: new Date(), origin: 'AuthorService', text: e['text'] ? e['text'] + (aut.corresponding ? ' (corr.)' : '') : e + (aut.corresponding ? ' (corr.)' : '') })
                        });
                        let inst = aut.affiliation?.trim() ? await firstValueFrom(this.instService.findOrSave(aut.affiliation?.trim())) : null;
                        if (aut_ent) authors_entities.push({ author: aut_ent, corresponding: aut.corresponding, affiliation: aut.affiliation?.trim(),institute: inst });
                    }
                }
                if (this.updateMapping.author_inst === UpdateOptions.REPLACE) {
                    //delete existing author publication relationships
                    await this.publicationService.resetAuthorPublication(orig);
                }
                if (this.updateMapping.author_inst === UpdateOptions.APPEND) {
                    for (let aut of authors_entities) if (!existing_aut.find(e => e.authorId === aut.id)) {
                        await this.publicationService.saveAuthorPublication(aut.author, orig, aut.corresponding, aut.affiliation, aut.institute);
                        fields.push('author_inst')
                    }
                }
            }
        }

        switch (this.updateMapping.invoice) {
            case UpdateOptions.IGNORE:
                break;
            case UpdateOptions.REPLACE_IF_EMPTY://append is replace if empty
                if (!orig.invoices || orig.invoices.length === 0) {
                    let inv_info = this.getInvoiceInformation(element);
                    orig.invoices = inv_info;
                    if (inv_info && inv_info.length > 0) fields.push('invoice')
                }
                break;
            case UpdateOptions.APPEND:
                if (!orig.invoices) orig.invoices = [];
                let inv_info1 = this.getInvoiceInformation(element);
                orig.invoices = orig.invoices.concat(inv_info1);
                if (inv_info1 && inv_info1.length > 0) fields.push('invoice')
                break;
            case UpdateOptions.REPLACE:
                let inv_info = this.getInvoiceInformation(element);
                if (inv_info) orig.invoices = inv_info; else orig.invoices = [];
                fields.push('invoice')
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
                }
                break;
            case UpdateOptions.REPLACE:
                orig.status = this.getStatus(element);
                if (orig.status) fields.push('status')
                break;
        }

        let res = this.finalize(orig, element);
        orig = res.pub;
        fields.push(...res.fields)

        let pub_ent: Publication;
        if (fields.length>0) pub_ent = (await this.publicationService.save([orig]))[0];
        return {pub:pub_ent,fields};
    }

    /**
     * final adaptions to updated publication object, however relations are already stored
     * @param orig 
     * @param element 
     */
    protected finalize(orig: Publication, element: any): {fields:string[], pub: Publication} {
        return {fields:[],pub:orig};
    }

    public status() {
        return {
            progress: this.progress,
            status: this.status_text
        };
    }
}