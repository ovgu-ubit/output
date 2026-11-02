import { Injectable } from "@nestjs/common";
import { AbstractFilterService, FilterService, SqlFilterService } from "./abstract-filter.service";
import {  PublicationIndex  } from '@output/interfaces';
import { PublicationService } from "../../publication/core/publication.service";
import { Publication } from "../../publication/core/Publication.entity";

@FilterService({path: 'missing-inst_auth'})
@Injectable()
export class MissingInstAuthorFilterService extends AbstractFilterService<PublicationIndex|Publication> implements SqlFilterService {

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

    getSqlPredicate(entityAlias: string): string {
        return `NOT EXISTS (SELECT 1 FROM author_publication missing_author
            WHERE missing_author."publicationId" = ${entityAlias}.id)`;
    }
}
