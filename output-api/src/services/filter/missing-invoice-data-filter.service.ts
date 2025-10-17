import { Injectable } from "@nestjs/common";
import { AbstractFilterService } from "./abstract-filter.service";
import { PublicationService } from "../../publication/core/publication.service";
import { PublicationIndex } from "../../../../output-interfaces/PublicationIndex";
import { Publication } from "../../publication/core/Publication";

@Injectable()
export class MissingInvoiceDataService extends AbstractFilterService<PublicationIndex|Publication>{

    constructor(private pubService: PublicationService) {super()}

    async filter(pubs:PublicationIndex[]|Publication[], options?:any):Promise<PublicationIndex[]|Publication[]> {
        let res = [];
        for (let pub of pubs) {
            let pub_ent = (await this.pubService.get({where: {id: pub.id}, relations: {authorPublications: true, invoices: true, contract: true}}))[0];
            if (!pub_ent.authorPublications || pub_ent.authorPublications.length == 0 || !pub_ent.authorPublications.find(e => e.corresponding)) continue;
            if ((!pub_ent.invoices || pub_ent.invoices.length === 0) && !pub_ent.contract) res.push(pub)
        }
        return res;
    }

    getName() {
        return 'Fehlende Rechnungsinformationen bei corr. Publikationen'
    }
}