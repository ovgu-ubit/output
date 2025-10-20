import { HttpService } from '@nestjs/axios';
import { ConflictException, Injectable, NotImplementedException } from '@nestjs/common';
import { concatMap, concatWith, map, merge, mergeAll, mergeMap, mergeWith, Observable, of, queueScheduler, scheduled, Subject, takeUntil } from 'rxjs';
import { Publication } from '../../publication/core/Publication';
import { PublicationService } from '../../publication/core/publication.service';

@Injectable()
export abstract class ApiImportCursorService {

    constructor(protected http: HttpService, protected publicationService: PublicationService) { }

    private progress = 0;
    private status_text = 'initialized';
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
    protected abstract mapNew(element: any): Promise<Publication>;
    protected abstract mapUpdate(element: any, orig: Publication): Promise<Publication>;

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

    public async import(update: boolean) {

        if (this.progress !== 0) throw new ConflictException('The import is already running, check status for further information.');
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