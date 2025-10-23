import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsRelations, ILike, In, Repository } from 'typeorm';
import { AliasFunder } from './AliasFunder';
import { PublicationService } from '../publication/core/publication.service';
import { Funder } from './Funder';
import { FunderIndex } from '../../../output-interfaces/PublicationIndex';
import { AppConfigService } from '../config/app-config.service';
import { AbstractEntityService } from '../common/abstract-entity.service';
import { AliasLookupService } from '../common/alias-lookup.service';
import { mergeEntities } from '../common/merge';

@Injectable()
export class FunderService extends AbstractEntityService<Funder> {

    constructor(
        @InjectRepository(Funder) repository: Repository<Funder>,
        @InjectRepository(AliasFunder) private aliasRepository: Repository<AliasFunder>,
        configService: AppConfigService,
        private publicationService: PublicationService,
        private aliasLookupService: AliasLookupService,
    ) {
        super(repository, configService);
    }

    protected override getFindOneRelations(): FindOptionsRelations<Funder> {
        return { aliases: true };
    }

    public async findOrSave(funder: Funder): Promise<Funder> {
        if (!funder.label && !funder.doi) return null;
        const canonicalFunder = await this.aliasLookupService.findCanonicalElement(this.aliasRepository, funder.label);
        const label = canonicalFunder?.label ?? funder.label;
        let funder_ent: Funder;
        if (funder.doi) funder_ent = await this.repository.findOne({ where: { doi: ILike(funder.doi) } });
        if (!funder_ent) {
            funder_ent = await this.repository.findOne({ where: { label: ILike(label) } });
            if (funder_ent && !funder_ent.doi && funder.doi) funder_ent = await this.repository.save({ id: funder_ent.id, doi: funder.doi });
        }
        if (funder_ent) return funder_ent;
        else return await this.repository.save({ label, doi: funder.doi }).catch(e => { throw { origin: 'funder-service', text: `Funder ${label} with DOI ${funder.doi} could not be inserted` }; });
    }

    public async index(reporting_year: number): Promise<FunderIndex[]> {
        let query = this.repository.createQueryBuilder("funder")
            .select("funder.id", "id")
            .addSelect("funder.label", "label")
            .addSelect("funder.doi", "doi")
            .addSelect("funder.ror_id", "ror_id")
            .addSelect("COUNT(DISTINCT publication.id)", "pub_count")
            .groupBy("funder.id")
            .addGroupBy("funder.label")
            .addGroupBy("funder.doi")
            .addGroupBy("funder.ror_id")

        if (reporting_year) {
            let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
            let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
            query = query
                .leftJoin("funder.publications", "publication", "publication.pub_date between :beginDate and :endDate", { beginDate, endDate })
        }
        else {
            query = query
                .leftJoin("funder.publications", "publication", "publication.pub_date IS NULL and publication.pub_date_print IS NULL and publication.pub_date_accepted IS NULL and publication.pub_date_submitted IS NULL")
        }
        //console.log(query.getSql());

        return query.getRawMany() as Promise<FunderIndex[]>;
    }

    public async combine(id1: number, ids: number[], alias_strings?: string[]) {
        return mergeEntities<Funder>({
            repository: this.repository,
            primaryId: id1,
            duplicateIds: ids,
            primaryRelations: { aliases: true },
            duplicateRelations: { aliases: true, publications: { funders: true } },
            mergeDuplicate: async ({ primary, duplicate, accumulator }) => {
                const pubs = duplicate.publications?.map(pub => {
                    const funders = (pub.funders ?? []).filter(f => f.id !== duplicate.id);
                    if (!funders.find(f => f.id === primary.id)) {
                        funders.push(primary);
                    }
                    return { id: pub.id, funders };
                }) ?? [];

                if (pubs.length > 0) {
                    await this.publicationService.save(pubs);
                }

                if (!accumulator.aliases) accumulator.aliases = [];

                duplicate.aliases?.forEach(alias => {
                    accumulator.aliases.push({ elementId: accumulator.id, alias: alias.alias });
                });

                if (!accumulator.label && duplicate.label) accumulator.label = duplicate.label;
                if (!accumulator.doi && duplicate.doi) accumulator.doi = duplicate.doi;
            },
            beforeSave: ({ accumulator }) => {
                if (!alias_strings || alias_strings.length === 0) {
                    return;
                }

                alias_strings.forEach(alias => {
                    accumulator.aliases.push({ elementId: accumulator.id, alias });
                });
            },
            afterSave: async ({ duplicateIds, defaultDelete }) => {
                if (duplicateIds.length > 0) {
                    await this.aliasRepository.delete({ elementId: In(duplicateIds) });
                }

                await defaultDelete();
            },
        });
    }

    public async delete(insts: Funder[]) {
        for (let inst of insts) {
            let conE: Funder = await this.repository.findOne({ where: { id: inst.id }, relations: { publications: { funders: true } }, withDeleted: true });
            let pubs = [];
            if (conE.publications) for (let pub of conE.publications) {
                pubs.push({ id: pub.id, funders: pub.funders.filter(e => e.id !== conE.id) });
            }
            await this.aliasRepository.delete({ elementId: conE.id });

            await this.publicationService.save(pubs);
        }
        return await this.repository.delete(insts.map(p => p.id));
    }
}

