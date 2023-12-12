import { ConflictException, Injectable } from '@nestjs/common';
import { PublicationService } from '../entities/publication.service';
import { ReportItemService } from '../report-item.service';
import { Publication } from '../../entity/Publication';

@Injectable()
export abstract class AbstractPlausibilityService {

    constructor(protected publicationService: PublicationService, protected reportService:ReportItemService) { }

    protected progress = 0;
    protected status_text = 'initialized';
    protected report: string;
    protected name = 'Abstract plausibility check'
    checked:number;
    identified:number;

    publications: Publication[];

    public async check(by_user?:string) {
        if (this.progress !== 0) throw new ConflictException('The check is already running, check status for further information.');
        this.progress = -1;
        this.status_text = 'Started on ' + new Date();
        this.report = this.reportService.createReport('Check',this.name, by_user);
        this.checked = 0;
        this.identified = 0;

        this.publications = (await this.publicationService.get());
        for (let [idx, pub] of this.publications.entries()) {
            this.checked++;
            if (this.checkPub(pub, idx)) this.identified++;
        }

        //finalize
        this.progress = 0;
        this.reportService.finish(this.report, {
            status: 'Successfull plausibility check on ' + new Date(),
            count_import: this.checked,
            count_update: this.identified
        })
        this.status_text = 'Successfull plausibility check on ' + new Date();
    }

    abstract checkPub(pub:Publication, idx:number):boolean;

    public getName() {
        return this.name;
    }

    public status() {
        return {
            progress: this.progress,
            status: this.status_text
        };
    }
}