import { Injectable } from '@nestjs/common';
import { Publication } from '../../publication/Publication';
import { ReportItemService } from '../report-item.service';
import { AbstractPlausibilityService } from './abstract-plausibility.service';
import { PublicationService } from '../../publication/publication.service';
import { PublisherService } from '../../publisher/publisher.service';

@Injectable()
/**
 * abstract class for all API imports that are based on pagesize and offsets
 */
export class PublisherDOIPrefixService extends AbstractPlausibilityService {

    constructor(protected publicationService: PublicationService, protected reportService: ReportItemService, private publisherService: PublisherService) {
        super(publicationService, reportService)
    }
    name = 'Publisher DOI Prefix Check'


    async checkPub(pub: Publication, idx: number) {
        let res = false;
        if (pub.publisher && pub.doi) {
            let other = await this.publisherService.findByDOI(pub.doi)
            if (other && other.id !== pub.publisher.id) {
                this.reportService.write(this.report, { type: 'info', publication_id: pub.id, timestamp: new Date(), origin: 'publisher_doi', text: `Possible DOI mismatch with ${other.label}` })
                res = true;
            }
        }
        return res;
    }
}