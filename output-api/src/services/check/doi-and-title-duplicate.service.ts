import { Injectable } from '@nestjs/common';
import { Publication } from '../../entity/Publication';
import { PublicationService } from '../entities/publication.service';
import { ReportItemService } from '../report-item.service';
import { AbstractPlausibilityService } from './abstract-plausibility.service';

@Injectable()
/**
 * abstract class for all API imports that are based on pagesize and offsets
 */
export class DOIandTitleDuplicateCheck extends AbstractPlausibilityService {

    constructor(protected publicationService: PublicationService, protected reportService: ReportItemService) {
        super(publicationService, reportService)
    }
    name = 'Publication Duplicate Check'

    async checkPub(pub: Publication, idx: number) {
        let res = false;
        if (pub.doi) {
            let dupl = this.publications.find((e, i) => i > idx && e.doi == pub.doi)
            if (dupl) {
                if (await this.publicationService.saveDuplicate(pub.id, dupl.id, 'Possible DOI duplicate')) {
                    this.reportService.write(this.report, { type: 'info', publication_id: pub.id, timestamp: new Date(), origin: 'doi_duplicate', text: `Possible DOI duplicate with ID ${dupl.id}` })
                    res = true;
                }
            }
        }
        if (pub.title) {
            let dupl = this.publications.find((e, i) => i > idx && (pub.title.toLocaleLowerCase().trim().includes(e.title?.toLocaleLowerCase().trim()) || e.title?.toLocaleLowerCase().trim().includes(pub.title.toLocaleLowerCase().trim())))
            if (dupl && pub.title.length > 9 && dupl.title.length > 9) {
                if (await this.publicationService.saveDuplicate(pub.id, dupl.id, 'Possible title duplicate')) {
                    this.reportService.write(this.report, { type: 'info', publication_id: pub.id, timestamp: new Date(), origin: 'title_duplicate', text: `Possible title duplicate with ID ${dupl.id}` })
                    res = true;
                }
            }
        }
        return res;
    }
}