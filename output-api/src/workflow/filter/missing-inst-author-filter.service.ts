import { Injectable } from "@nestjs/common";
import { AbstractFilterService, FilterService } from "./abstract-filter.service";
import { PublicationIndex } from "../../../../output-interfaces/PublicationIndex";
import { PublicationService } from "../../publication/core/publication.service";
import { Publication } from "../../publication/core/Publication.entity";

@FilterService({path: 'missing-inst_auth'})
@Injectable()
export class MissingInstAuthorFilterService extends AbstractFilterService<PublicationIndex|Publication>{

    constructor(private pubService: PublicationService) {super()}

    async filter(pubs:PublicationIndex[]|Publication[], options?:any):Promise<PublicationIndex[]|Publication[]> {
        const res = [];
        for (const pub of pubs) {
            const pub_ent = (await this.pubService.get({where: {id: pub.id}, relations: {authorPublications: true}}))[0];
            if (!pub_ent.authorPublications || pub_ent.authorPublications.length == 0) res.push(pub);
        }
        return res;
    }

    getName() {
        return 'Kein*e Autor*in der Institution zugeordnet'
    }
}