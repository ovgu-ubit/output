import { Injectable } from "@nestjs/common";
import { AbstractFilterService, FilterService, SqlFilterService } from "./abstract-filter.service";
import { PublicationService } from "../../publication/core/publication.service";
import {  PublicationIndex  } from '@output/interfaces';
import { Publication } from "../../publication/core/Publication.entity";

@FilterService({path: 'missing-invoice'})
@Injectable()
export class MissingInvoiceDataService extends AbstractFilterService<PublicationIndex|Publication> implements SqlFilterService {

    constructor(private pubService: PublicationService) {super()}

    async filter(pubs:PublicationIndex[]|Publication[], options?:any):Promise<PublicationIndex[]|Publication[]> {
        const res = [];
        for (const pub of pubs) {
            const pub_ent = (await this.pubService.get({where: {id: pub.id}, relations: {authorPublications: true, invoices: true, contract: true}}))[0];
            if (!pub_ent.authorPublications || pub_ent.authorPublications.length == 0 || !pub_ent.authorPublications.find(e => e.corresponding)) continue;
            if ((!pub_ent.invoices || pub_ent.invoices.length === 0) && !pub_ent.contract) res.push(pub)
        }
        return res;
    }

    getName() {
        return 'Fehlende Rechnungsinformationen bei corr. Publikationen'
    }

    getSqlPredicate(entityAlias: string): string {
        return `EXISTS (SELECT 1 FROM author_publication corresponding_author
                WHERE corresponding_author."publicationId" = ${entityAlias}.id
                    AND corresponding_author."corresponding" IS TRUE)
            AND NOT EXISTS (SELECT 1 FROM invoice missing_invoice
                WHERE missing_invoice."publicationId" = ${entityAlias}.id)
            AND ${entityAlias}."contractId" IS NULL`;
    }
}
