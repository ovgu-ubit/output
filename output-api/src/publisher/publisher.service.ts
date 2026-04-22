import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, DeepPartial, FindOptionsRelations, ILike, In, Repository } from 'typeorm';
import { Publisher } from './Publisher.entity';
import { AliasPublisher } from './AliasPublisher.entity';
import { PublicationService } from '../publication/core/publication.service';
import { PublisherIndex } from '../../../output-interfaces/PublicationIndex';
import { Publication } from '../publication/core/Publication.entity';
import { AppConfigService } from '../config/app-config.service';
import { AbstractEntityService } from '../common/abstract-entity.service';
import { AliasLookupService } from '../common/alias-lookup.service';
import { mergeEntities } from '../common/merge';
import { PublisherDOI } from './PublisherDOI.entity';

@Injectable()
export class PublisherService extends AbstractEntityService<Publisher> {

    constructor(
        @InjectRepository(Publisher) repository: Repository<Publisher>,
        configService: AppConfigService,
        private publicationService: PublicationService,
        @InjectRepository(AliasPublisher) private aliasRepository: Repository<AliasPublisher>,
        @InjectRepository(PublisherDOI) private doiRepository: Repository<PublisherDOI>,
        private aliasLookupService: AliasLookupService,
        private dataSource: DataSource
    ) {
        super(repository, configService);
    }

    protected override getFindOneRelations(): FindOptionsRelations<Publisher> {
        return { aliases: true, doi_prefixes: true };
    }

    public override async save(entity: DeepPartial<Publisher>, user?: string) {
        return this.dataSource.transaction(async (manager) => {
            const aliases = entity.aliases;
            const doiPrefixes = entity.doi_prefixes;
            const saved = await super.save(this.stripOwnedCollections(entity, ['aliases', 'doi_prefixes']), user, { manager });

            if (doiPrefixes !== undefined) {
                saved.doi_prefixes = await this.replaceOwnedCollection({
                    parent: saved,
                    children: doiPrefixes,
                    repository: manager.getRepository(PublisherDOI),
                    parentName: 'Publisher',
                    collectionName: 'DOI prefixes',
                    deleteByParentId: (publisherId) => ({ publisherId }),
                    mapChild: (doiPrefix, publisherId) => ({
                        doi_prefix: doiPrefix.doi_prefix,
                        publisherId,
                        publisher: { id: publisherId } as Publisher,
                    }),
                });
            }
            if (aliases !== undefined) {
                saved.aliases = await this.replaceAliasCollection(saved, aliases, manager.getRepository(AliasPublisher), 'Publisher');
            }

            return saved;
        });
    }

    public async findOrSave(publisher: Publisher, dryRun = false): Promise<Publisher> {
        if (!publisher.label) return null;
        const canonicalPublisher = await this.aliasLookupService.findCanonicalElement<AliasPublisher, Publisher>(this.aliasRepository, publisher.label);
        const label = canonicalPublisher?.label ?? publisher.label;
        let publisher_ent: Publisher;
        publisher_ent = await this.repository.findOne({ where: { label: ILike(label) } })
        if (!publisher_ent && publisher.doi_prefixes) {
            publisher_ent = await this.repository.findOne({ where: { doi_prefixes: { doi_prefix: In(publisher.doi_prefixes.map(e => e.doi_prefix)) } }, relations: { doi_prefixes: true } })
        }
        if (publisher_ent || dryRun) return publisher_ent;
        else return this.save({ label, doi_prefixes: publisher.doi_prefixes });
    }

    public async findByDOI(doi: string) {
        const regex = /(10.*)\//g;
        const found = doi.match(regex);
        const doi_search = found[0].slice(0, found[0].length - 1);
        return await this.repository.findOne({ where: { doi_prefixes: { doi_prefix: ILike(doi_search) } }, relations: { doi_prefixes: true } })
    }

    public async index(reporting_year: number): Promise<PublisherIndex[]> {

        let query = this.repository.manager.createQueryBuilder()
            .from((sq) => sq
                .from("publisher", "publisher")
                .leftJoin("publisher.doi_prefixes", "doi_prefix")
                .select("publisher.id", "id")
                .addSelect("publisher.label", "label")
                .addSelect("STRING_AGG(DISTINCT doi_prefix.doi_prefix, ';')", "doi_prefix")
                .groupBy("publisher.id")
                .addGroupBy("publisher.label")
                , "a")
            .select("a.id", "id")
            .addSelect("a.label", "label")
            .addSelect("a.doi_prefix", "doi_prefix")
            .addSelect("COUNT(publication.id)", "pub_count")
            .groupBy("a.id")
            .addGroupBy("a.label")
            .addGroupBy("a.doi_prefix")

        if (reporting_year) {
            const beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
            const endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
            query = query
                .leftJoin(Publication, "publication", "publication.\"publisherId\" = a.id and publication.pub_date between :beginDate and :endDate", { beginDate, endDate })
        }
        else {
            query = query
                .leftJoin(Publication, "publication", "publication.\"publisherId\" = a.id and publication.pub_date IS NULL and publication.pub_date_print IS NULL and publication.pub_date_accepted IS NULL and publication.pub_date_submitted IS NULL")
        }
        //console.log(query.getSql());

        return query.getRawMany() as Promise<PublisherIndex[]>;
    }

    public async combine(id1: number, ids: number[], alias_strings?: string[]) {
        return mergeEntities<Publisher>({
            repository: this.repository,
            primaryId: id1,
            duplicateIds: ids,
            primaryOptions: {relations: { aliases: true, doi_prefixes: true }},
            duplicateOptions: {relations: { publications: true, aliases: true, doi_prefixes: true }},
            mergeContext: {
                field: 'publisher',
                service: this.publicationService,
                alias_strings
            },
            afterSave: async ({ duplicateIds, defaultDelete }) => {
                if (duplicateIds.length > 0) {
                    await this.aliasRepository.delete({ elementId: In(duplicateIds) });
                }
                if (duplicateIds.length > 0) {
                    await this.doiRepository.delete({ publisherId: In(duplicateIds) });
                }

                await defaultDelete();
            },
        });
    }

    public async delete(insts: Publisher[]) {
        return this.dataSource.transaction(async (manager) => {
            const publisherIds = insts.map(publisher => publisher.id).filter((id): id is number => typeof id === 'number');
            for (const inst of insts) {
                const conE: Publisher = await manager.getRepository(Publisher).findOne({ where: { id: inst.id }, relations: { publications: true, aliases: true, doi_prefixes: true }, withDeleted: true });
                const pubs = [];
                if (conE.publications) for (const pub of conE.publications) {
                    pubs.push({ id: pub.id, publisher: null })
                }

                await this.publicationService.save(pubs, { manager });
            }
            await this.deleteAliasCollection(manager.getRepository(AliasPublisher), publisherIds);
            await this.deleteOwnedCollection({
                parentIds: publisherIds,
                repository: manager.getRepository(PublisherDOI),
                deleteByParentIds: (ids) => ({ publisherId: In(ids) }),
            });
            return await manager.getRepository(Publisher).delete(publisherIds);
        });
    }
}
