import { HttpService } from '@nestjs/axios';
import { ConflictException, Injectable, NotImplementedException } from '@nestjs/common';
import { concatMap, concatWith, map, merge, mergeAll, mergeMap, mergeWith, Observable, of, queueScheduler, scheduled, Subject, takeUntil } from 'rxjs';
import { Publication } from '../../publication/core/Publication.entity';
import { PublicationService } from '../../publication/core/publication.service';
import { AbstractImportService } from './abstract-import';
import { AuthorService } from '../../author/author.service';
import { FunderService } from '../../funder/funder.service';
import { OACategoryService } from '../../oa_category/oa-category.service';
import { InstituteService } from '../../institute/institute.service';
import { AppConfigService } from '../../config/app-config.service';
import { InvoiceService } from '../../invoice/invoice.service';
import { ReportItemService } from '../report-item.service';
import { PublisherService } from '../../publisher/publisher.service';
import { GreaterEntityService } from '../../greater_entity/greater-entitiy.service';
import { PublicationTypeService } from '../../pub_type/publication-type.service';
import { ContractService } from '../../contract/contract.service';
import { LanguageService } from '../../publication/lookups/language.service';
import { RoleService } from '../../publication/relations/role.service';

@Injectable()
export abstract class ApiImportCursorService extends AbstractImportService {

    constructor(protected publicationService: PublicationService, protected authorService: AuthorService,
        protected geService: GreaterEntityService, protected funderService: FunderService, protected publicationTypeService: PublicationTypeService,
        protected publisherService: PublisherService, protected oaService: OACategoryService, protected contractService: ContractService,
        protected reportService: ReportItemService, protected instService: InstituteService, protected languageService: LanguageService, protected roleService: RoleService,
        protected invoiceService: InvoiceService, protected configService: AppConfigService, protected http: HttpService) {
        super(publicationService, authorService, geService, funderService, publicationTypeService, publisherService, oaService, contractService, reportService, instService, languageService, roleService, invoiceService, configService);
    }

    private newPublications: Publication[] = [];
    private publicationsUpdate = [];
    private numberOfPublications: number;
    private processedPublications = 0;
    private completeURL = '';
    private nextRequest = null;

    protected url = '';
    protected cursor_name = '';
    protected cursor_init = '';
    protected params: { key: string, value: string }[] = [];
    protected name = '';
    protected parallelCalls = 1;

    protected abstract getNumber(response: any): number;
    protected abstract getNextCursor(response: any): string;
    protected abstract getData(response: any): any[];
    protected abstract getDOI(element: any): string;
    protected abstract getTitle(element: any): string;

    private request(cursor: string): Observable<any> {
        const url = this.completeURL + `${this.cursor_name}=` + cursor;
        console.log(url);
        return this.http.get(url);
    }

    private calls = new Subject<any>();

    private async processResponse(resp: any, update: boolean) {
        let data = this.getData(resp);
        this.numberOfPublications = this.getNumber(resp);
        for (let [idx, pub] of data.entries()) {
            let flag = await this.publicationService.checkDOIorTitleAlreadyExists(this.getDOI(pub), this.getTitle(pub))
            let flag2 = this.newPublications.find(e => e.doi.trim().toLocaleLowerCase() === this.getDOI(pub).trim().toLocaleLowerCase());
            if (flag2) console.log(`Redundant publication with DOI ${this.getDOI(pub)} at position ${idx} of request ${data['config']?.url}`)
            if (!flag && !flag2) {
                let pubNew = await this.mapNew(pub);
                if (pubNew) this.newPublications.push(pubNew);
            } else if (update) {
                let orig = await this.publicationService.getPubwithDOIorTitle(this.getDOI(pub), this.getTitle(pub));
                if (orig.locked || orig.delete_date) continue;
                let pubUpd = await this.mapUpdate(pub, orig);
                if (pubUpd) this.publicationsUpdate.push(pubUpd);
            }
        }
        // Update Progress Value
        this.processedPublications += data.length;
        if (this.progress !== 0) this.progress = (this.processedPublications) / this.numberOfPublications;
        if (this.progress === 1) {
            console.log(this.newPublications.length + ' pubs import to DB');
            console.log(this.publicationsUpdate.length + ' pubs update to DB');
            //insert new objects
            await this.publicationService.save(this.newPublications);
            //update objects
            await this.publicationService.save(this.publicationsUpdate);
            //finalize
            this.progress = 0;
            this.status_text = 'Successfull import on ' + new Date();
        }
    }

    protected async init() {

    }

    public async import(update: boolean, by_user?: string, dryRun = false) {
        if (this.progress !== 0) throw new ConflictException('The enrich is already running, check status for further information.');
        this.dryRun = dryRun;
        await this.init();
        this.progress = -1;
        this.status_text = 'Started on ' + new Date();

        if (!this.url.endsWith('?') && this.params.length !== 0) this.completeURL = this.url + '?';
        else this.completeURL = this.url;
        this.params.forEach(e => {
            this.completeURL += `${e.key}=${e.value}&`;
        })

        this.processedPublications = 0;
        this.newPublications = [];
        this.publicationsUpdate = [];
        this.numberOfPublications = 0;

        this.calls.pipe(
            // margeMap allows to set concurrency level as second parameter
            concatMap(cursor => this.request(cursor))
        ).subscribe(
            {
                next: async response => {
                    // do something with the response
                    await this.processResponse(response, update);
                    if (this.progress !== 1) this.calls.next(this.getNextCursor(response));
                },
                error: err => {
                    // manage error occurrences
                    console.log(err)
                },
                complete: () => {
                    // here you come when the Subject completes
                    console.log('complete')
                }
            }
        );

        this.calls.next(this.cursor_init);
    }

    public status() {
        return {
            progress: this.progress,
            status: this.status_text
        };
    }
}