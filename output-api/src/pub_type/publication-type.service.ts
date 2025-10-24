import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsRelations, ILike, In, Repository } from 'typeorm';
import { PublicationTypeIndex } from '../../../output-interfaces/PublicationIndex';
import { AliasPubType } from './AliasPubType';
import { PublicationService } from '../publication/core/publication.service';
import { PublicationType } from './PublicationType';
import { AppConfigService } from '../config/app-config.service';
import { AbstractEntityService } from '../common/abstract-entity.service';
import { mergeEntities } from '../common/merge';

@Injectable()
export class PublicationTypeService extends AbstractEntityService<PublicationType> {

    constructor(
        @InjectRepository(PublicationType) repository: Repository<PublicationType>,
        @InjectRepository(AliasPubType) private aliasRepository: Repository<AliasPubType>,
        configService: AppConfigService,
        private publicationService: PublicationService,
    ) {
        super(repository, configService);
    }

    protected override getFindOneRelations(): FindOptionsRelations<PublicationType> {
        return { aliases: true };
    }

    public async findOrSave(title: string): Promise<PublicationType> {
        if (!title) return null;
        let label = await this.identifyPublicationType(title);

        let pubtype = await this.repository.findOne({ where: { label: ILike(label) } });

        if (pubtype) return pubtype;
        else return await this.repository.save({ label }).catch(e => { throw { origin: 'pubType-service', text: `PubType ${label} could not be inserted` }; });
    }

    public async identifyPublicationType(title: string) {
        let alias = await this.aliasRepository.createQueryBuilder('alias')
            .leftJoinAndSelect('alias.element', 'element')
            .where(':label ILIKE CONCAT(\'%\',alias.alias,\'%\')', { label: title })
            .getMany();

        if (alias && alias.length === 1) return alias[0].element.label;
        else if (alias && alias.length > 1) {
            //console.log('ambigious ptype alias '+title+', first type is assigned: '+alias.map(e=> e.element.label).join(', '))
            return alias[0].element.label;
        }
        return title;
    }

    public async index(reporting_year: number): Promise<PublicationTypeIndex[]> {
        let query = this.repository.createQueryBuilder("type")
            .select("type.id", "id")
            .addSelect("type.label", "label")
            .addSelect("type.review", "review")
            .addSelect("COUNT(publication.id)", "pub_count")
            .groupBy("type.id")
            .addGroupBy("type.label")
            .addGroupBy("type.review")

        if (reporting_year) {
            let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
            let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
            query = query
                .leftJoin("type.publications", "publication", "publication.pub_date between :beginDate and :endDate", { beginDate, endDate })
        }
        else {
            query = query
                .leftJoin("type.publications", "publication", "publication.pub_date IS NULL and publication.pub_date_print IS NULL and publication.pub_date_accepted IS NULL and publication.pub_date_submitted IS NULL")
        }
        //console.log(query.getSql());

        return query.getRawMany() as Promise<PublicationTypeIndex[]>;
    }

    public async combine(id1: number, ids: number[], alias_strings?: string[]) {
        return mergeEntities<PublicationType>({
            repository: this.repository,
            primaryId: id1,
            duplicateIds: ids,
            primaryOptions: {relations: { aliases: true }},
            duplicateOptions: {relations: { publications: { pub_type: true }, aliases: true }},
            mergeContext: {
                field: 'pub_type',
                service: this.publicationService,
                alias_strings
            },
            afterSave: async ({ duplicateIds, defaultDelete }) => {
                if (duplicateIds.length > 0) {
                    await this.aliasRepository.delete({ elementId: In(duplicateIds) });
                }

                await defaultDelete();
            },
        });
    }

    public async delete(insts: PublicationType[]) {
        for (let inst of insts) {
            let conE: PublicationType = await this.repository.findOne({ where: { id: inst.id }, relations: { publications: { pub_type: true } }, withDeleted: true });
            let pubs = [];
            if (conE.publications) for (let pub of conE.publications) {
                pubs.push({ id: pub.id, pub_type: null });
            }

            await this.publicationService.save(pubs);
            await this.aliasRepository.delete({ elementId: conE.id });
        }
        return await this.repository.delete(insts.map(p => p.id));
    }
}

