import { Injectable } from "@nestjs/common";
import { Publication } from "../../entity/Publication";
import { AbstractFilterService } from "./abstract-filter.service";
import { PublicationService } from "../entities/publication.service";
import { PublicationIndex } from "../../../../output-interfaces/PublicationIndex";

@Injectable()
export class MissingInstAuthorFilterService extends AbstractFilterService<PublicationIndex>{

    constructor(private pubService: PublicationService) {super()}

    async filter(pubs:PublicationIndex[], options?:any):Promise<PublicationIndex[]> {
        let res = [];
        for (let pub of pubs) {
            let pub_ent = (await this.pubService.get({where: {id: pub.id}, relations: {authorPublications: true}}))[0];
            if (!pub_ent.authorPublications || pub_ent.authorPublications.length == 0) res.push(pub);
        }
        return res;
    }

    getName() {
        return 'Kein*e Autor*in der Intitution zugeordnet'
    }
}