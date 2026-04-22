import { DeepPartial, EntityManager, FindOneOptions, FindOptionsWhere, Repository } from 'typeorm';
import { Author } from '../../author/Author.entity';
import { createInternalErrorHttpException, createNotFoundHttpException, createPersistenceHttpException } from '../api-error';
import { PublicationService } from '../../publication/core/publication.service';
import { AuthorPublication } from '../../publication/relations/AuthorPublication.entity';

export interface MergeValidationContext<TEntity extends { id?: number | null }> {
    primary: TEntity;
    duplicates: TEntity[];
    duplicateIds: number[];
}

export interface MergeDuplicateContext<TEntity extends { id?: number | null }, TAccumulator> {
    field?: string;
    autField?: string;
    alias_strings?: string[];
    service?: PublicationService;
    pubAutrepository?: Repository<AuthorPublication>;
    autRepository?: Repository<Author>;
    aliases_first_name?: string[];
    aliases_last_name?: string[];
}

export interface MergeFinalizeContext<TEntity extends { id?: number | null }, TAccumulator> {
    primary: TEntity;
    duplicates: TEntity[];
    accumulator: TAccumulator;
}

export interface MergeAfterSaveContext<TEntity extends { id?: number | null }, TAccumulator> {
    saved: TEntity;
    duplicates: TEntity[];
    accumulator: TAccumulator;
    duplicateIds: number[];
    defaultDelete: () => Promise<void>;
}

export interface MergeOptions<TEntity extends { id?: number | null }, TAccumulator = TEntity> {
    repository: Repository<TEntity>;
    primaryId: number;
    duplicateIds: number[];
    primaryOptions?: FindOneOptions<TEntity>;
    duplicateOptions?: FindOneOptions<TEntity>;
    notFoundMessage?: string;
    mergeContext: MergeDuplicateContext<TEntity, TAccumulator>;
    afterSave?: (context: MergeAfterSaveContext<TEntity, TAccumulator>) => Promise<void> | void;
    validate?: (context: MergeValidationContext<TEntity>) => Promise<void> | void;
    manager?: EntityManager;
}

export async function mergeEntities<TEntity extends { id?: number | null }, TAccumulator = TEntity>(options: MergeOptions<TEntity, TAccumulator>) {
    const {
        repository,
        primaryId,
        duplicateIds,
        primaryOptions,
        duplicateOptions,
        notFoundMessage = 'Resource to merge not found.',
        mergeContext,
        afterSave,
        validate,
        manager,
    } = options;

    const repo = manager ? manager.getRepository(repository.target) : repository;

    const primaryFindOptions = {...primaryOptions, where: { id: primaryId } as FindOptionsWhere<TEntity>}
    const primary = await repo.findOne(primaryFindOptions);
    if (!primary) {
        throw createNotFoundHttpException(notFoundMessage);
    }

    const presentDuplicates = await Promise.all(
        duplicateIds.map(id => {
            let duplicateFindOptions = {...duplicateOptions};
            if (!duplicateFindOptions.relations && primaryOptions?.relations) {
                duplicateFindOptions = { relations: primaryOptions.relations };
            }
            duplicateFindOptions.where = { id } as FindOptionsWhere<TEntity>;
            return repo.findOne(duplicateFindOptions);
        }),
    ) as TEntity[];

    if (presentDuplicates.some(duplicate => !duplicate)) {
        throw createNotFoundHttpException(notFoundMessage);
    }

    if (validate) {
        await validate({ primary, duplicates: presentDuplicates, duplicateIds });
    }

    const accumulator = (structuredClone(primary) as unknown as Record<string, unknown> as TAccumulator);

    for (let index = 0; index < presentDuplicates.length; index++) {
        const duplicate = presentDuplicates[index];

        for (const key of Object.keys(duplicate)) {
            if (key === 'id' || key.startsWith('locked_') || key === 'edit_date' || key === 'delete_date' || key === 'import_date') continue;
            const value = accumulator[key];
            if (key === 'publications') {
                const pubs = duplicate[key]?.map(pub => {
                    const obj = { id: pub.id }
                    if (mergeContext.field === 'funders') { //n to m relation
                        const funders = (pub[mergeContext.field] ?? []).filter(f => f.id !== duplicate.id);
                        if (!funders.find(f => f.id === primary.id)) {
                            funders.push(primary);
                        }
                        obj[mergeContext.field] = funders;
                    }
                    else obj[mergeContext.field] = primary;
                    return obj
                }) ?? [];
                if (pubs.length > 0) {
                    await mergeContext.service.save(pubs, { manager });
                }
            } else if (key === 'authorPublications') {
                for (const ap of duplicate[key] ?? []) {
                    const obj = { id: ap['id'] };
                    obj[mergeContext.field] = accumulator;
                    const apRepo = manager ? manager.getRepository(AuthorPublication) : mergeContext.pubAutrepository;
                    await apRepo.save(obj);
                }
            } else if (key === 'authors' && mergeContext.autField === 'institutes') {
                for (const auth of duplicate[key] ?? []) {
                    const obj = { id: auth['id'] };
                    const institutes = (auth[mergeContext.autField] ?? []).filter(inst => inst.id !== duplicate.id);
                    if (!institutes.find(inst => inst.id === primary.id)) {
                        institutes.push(primary);
                    }
                    obj[mergeContext.autField] = institutes;
                    const autRepo = manager ? manager.getRepository(Author) : mergeContext.autRepository;
                    await autRepo.save(obj)
                }
            }
            else if (value instanceof Date || typeof value === 'boolean') {
                if (value === null) accumulator[key] = duplicate[key];
            } else if (Array.isArray(value)) {//1 to n relation
                if (Array.isArray(duplicate[key])) accumulator[key] = value.concat(duplicate[key])
                if (key === 'aliases' && mergeContext.alias_strings) {
                    mergeContext.alias_strings.forEach(alias => {
                        accumulator[key].push({ elementId: accumulator['id'], alias });
                    })
                } else if (key === 'aliases_first_name' && mergeContext.aliases_first_name) {
                    mergeContext.aliases_first_name.forEach(alias => {
                        accumulator[key].push({ elementId: accumulator['id'], alias });
                    })
                } else if (key === 'aliases_last_name' && mergeContext.aliases_last_name) {
                    mergeContext.aliases_last_name.forEach(alias => {
                        accumulator[key].push({ elementId: accumulator['id'], alias });
                    })
                }
            } else {
                if (!value) accumulator[key] = duplicate[key];
            }
        }
    }

    let saved: TEntity;
    try {
        saved = await repo.save(accumulator as DeepPartial<TEntity>);
    } catch (error) {
        throw createPersistenceHttpException(error);
    }

    const defaultDelete = async () => {
        if (duplicateIds.length === 0) {
            return;
        }
        await repo.delete(duplicateIds);
    };

    try {
        if (afterSave) {
            await afterSave({ saved, duplicates: presentDuplicates, accumulator, duplicateIds, defaultDelete });
        } else {
            await defaultDelete();
        }
    } catch (error) {
        throw createInternalErrorHttpException();
    }

    return saved;
}
