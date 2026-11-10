import { DataSource, EntityTarget, ObjectLiteral, Repository } from 'typeorm';
import { AppConfigService } from '../../src/config/app-config.service';
import { AliasLookupService } from '../../src/common/alias-lookup.service';
import { EntityAccessRight } from '../../src/common/abstract-entity.service';
import { PublicationService } from '../../src/publication/core/publication.service';
import { AuthorPublication } from '../../src/publication/relations/AuthorPublication.entity';
import { Author } from '../../src/author/Author.entity';
import { AuthorService } from '../../src/author/author.service';
import { AliasAuthorFirstName } from '../../src/author/AliasAuthorFirstName.entity';
import { AliasAuthorLastName } from '../../src/author/AliasAuthorLastName.entity';
import { Institute } from '../../src/institute/Institute.entity';
import { InstituteService } from '../../src/institute/institute.service';
import { AliasInstitute } from '../../src/institute/AliasInstitute.entity';
import { Funder } from '../../src/funder/Funder.entity';
import { FunderService } from '../../src/funder/funder.service';
import { AliasFunder } from '../../src/funder/AliasFunder.entity';
import { Publisher } from '../../src/publisher/Publisher.entity';
import { PublisherService } from '../../src/publisher/publisher.service';
import { AliasPublisher } from '../../src/publisher/AliasPublisher.entity';
import { PublisherDOI } from '../../src/publisher/PublisherDOI.entity';
import { PublicationType } from '../../src/pub_type/PublicationType.entity';
import { PublicationTypeService } from '../../src/pub_type/publication-type.service';
import { AliasPubType } from '../../src/pub_type/AliasPubType.entity';
import { OA_Category } from '../../src/oa_category/OA_Category.entity';
import { OACategoryService } from '../../src/oa_category/oa-category.service';
import { GreaterEntity } from '../../src/greater_entity/GreaterEntity.entity';
import { GreaterEntityService } from '../../src/greater_entity/greater-entitiy.service';
import { GEIdentifier } from '../../src/greater_entity/GEIdentifier.entity';
import { Contract } from '../../src/contract/Contract.entity';
import { ContractService } from '../../src/contract/contract.service';
import { ContractIdentifier } from '../../src/contract/ContractIdentifier.entity';
import { ContractComponent } from '../../src/contract/ContractComponent.entity';
import { Invoice } from '../../src/invoice/Invoice.entity';

export interface MasterMergeFixture {
    name: string;
    repository: Repository<ObjectLiteral>;
    publicationField?: string;
    create(label: string): Promise<{ id: number }>;
    open(id: number, user: string): Promise<unknown>;
    merge(id: number, duplicates: number[], user: string): Promise<unknown>;
}

export function masterMergeFixtures(source: DataSource, publications: PublicationService, config: AppConfigService): MasterMergeFixture[] {
    const aliases = new AliasLookupService();
    const institutes = new InstituteService(source.manager, config, source.getRepository(AuthorPublication), source.getRepository(Author),
        source.getRepository(AliasInstitute), aliases, source);
    const authors = new AuthorService(source.getRepository(Author), institutes, source.getRepository(AuthorPublication),
        source.getRepository(AliasAuthorFirstName), source.getRepository(AliasAuthorLastName), config, aliases, source);
    const funders = new FunderService(source.getRepository(Funder), source.getRepository(AliasFunder), config, publications, aliases, source);
    const publishers = new PublisherService(source.getRepository(Publisher), config, publications, source.getRepository(AliasPublisher),
        source.getRepository(PublisherDOI), aliases, source);
    const types = new PublicationTypeService(source.getRepository(PublicationType), source.getRepository(AliasPubType), config, publications, source);
    const categories = new OACategoryService(source.getRepository(OA_Category), config, publications, source);
    const greater = new GreaterEntityService(source.getRepository(GreaterEntity), source.getRepository(GEIdentifier), publications, config, source);
    const contracts = new ContractService(source.getRepository(Contract), config, publications, source.getRepository(ContractIdentifier),
        source.getRepository(ContractComponent), source.getRepository(Invoice), greater, source);
    const scope = (username: string) => ({ username, rights: { [EntityAccessRight.Write]: true } });
    const definitions: {
        entity: EntityTarget<ObjectLiteral>;
        publicationField?: string;
        open: MasterMergeFixture['open'];
        merge: MasterMergeFixture['merge'];
    }[] = [
        { entity: Author, open: (id, user) => authors.oneOrFail(id, scope(user)),
            merge: (id, duplicates, user) => authors.combineAuthors(id, duplicates, undefined, undefined, user) },
        { entity: Institute, open: (id, user) => institutes.oneOrFail(id, true, user),
            merge: (id, duplicates, user) => institutes.combine(id, duplicates, undefined, user) },
        { entity: Funder, publicationField: 'funders', open: (id, user) => funders.oneOrFail(id, scope(user)),
            merge: (id, duplicates, user) => funders.combine(id, duplicates, undefined, user) },
        { entity: Publisher, publicationField: 'publisher', open: (id, user) => publishers.oneOrFail(id, scope(user)),
            merge: (id, duplicates, user) => publishers.combine(id, duplicates, undefined, user) },
        { entity: PublicationType, publicationField: 'pub_type', open: (id, user) => types.oneOrFail(id, scope(user)),
            merge: (id, duplicates, user) => types.combine(id, duplicates, undefined, user) },
        { entity: OA_Category, publicationField: 'oa_category', open: (id, user) => categories.oneOrFail(id, scope(user)),
            merge: (id, duplicates, user) => categories.combine(id, duplicates, user) },
        { entity: GreaterEntity, publicationField: 'greater_entity', open: (id, user) => greater.oneOrFail(id, scope(user)),
            merge: (id, duplicates, user) => greater.combine(id, duplicates, user) },
        { entity: Contract, publicationField: 'contract', open: (id, user) => contracts.oneOrFail(id, scope(user)),
            merge: (id, duplicates, user) => contracts.combine(id, duplicates, undefined, user) },
    ];
    return definitions.map(({ entity, publicationField, open, merge }) => {
        const repository = entity === Institute ? source.getTreeRepository(Institute) : source.getRepository(entity);
        return {
            name: repository.metadata.tableName, repository, publicationField,
            create: async label => {
                const saved = await repository.save(entity === Author ? { first_name: label, last_name: 'Merge test' } : { label });
                return { id: Number(saved.id) };
            },
            open, merge,
        };
    });
}
