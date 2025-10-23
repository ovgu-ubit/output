import { DeepPartial, FindOptionsRelations, FindOptionsWhere, Repository } from 'typeorm';
import { AbstractEntityService } from '../abstract-entity.service';
import { Publication } from '../../publication/core/Publication';
import { AuthorPublication } from '../../publication/relations/AuthorPublication';
import { Author } from '../../author/Author';
import { PublicationService } from '../../publication/core/publication.service';

export type MergeError = 'find' | 'update' | 'delete';

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
    autRepository?: Repository<Author>
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
    primaryRelations?: FindOptionsRelations<TEntity>;
    duplicateRelations?: FindOptionsRelations<TEntity>;
    mergeContext: MergeDuplicateContext<TEntity, TAccumulator>;
    afterSave?: (context: MergeAfterSaveContext<TEntity, TAccumulator>) => Promise<void> | void;
    validate?: (context: MergeValidationContext<TEntity>) => Promise<MergeError | void> | MergeError | void;
}

export async function mergeEntities<TEntity extends { id?: number | null }, TAccumulator = TEntity>(options: MergeOptions<TEntity, TAccumulator>) {
    const {
        repository,
        primaryId,
        duplicateIds,
        primaryRelations,
        duplicateRelations,
        mergeContext,
        afterSave,
        validate,
    } = options;

    const primary = await repository.findOne({ where: { id: primaryId } as FindOptionsWhere<TEntity>, relations: primaryRelations });
    if (!primary) {
        return { error: 'find' as MergeError };
    }

    const presentDuplicates = await Promise.all(
        duplicateIds.map(id => repository.findOne({ where: { id } as FindOptionsWhere<TEntity>, relations: duplicateRelations ?? primaryRelations ?? {} })),
    ) as TEntity[];

    if (presentDuplicates.some(duplicate => !duplicate)) {
        return { error: 'find' as MergeError };
    }

    if (validate) {
        const validationError = await validate({ primary, duplicates: presentDuplicates, duplicateIds });
        if (validationError) {
            return { error: validationError };
        }
    }

    const accumulator = (structuredClone(primary) as unknown as Record<string, unknown> as TAccumulator);

    for (let index = 0; index < presentDuplicates.length; index++) {
        const duplicate = presentDuplicates[index];

        for (let key of Object.keys(duplicate)) {
            if (key === 'id' || key.startsWith('locked_') || key === 'edit_date' || key === 'delete_date' || key === 'import_date') continue;
            let value = accumulator[key];
            if (key === 'publications') {
                const pubs = duplicate[key]?.map(pub => {
                    let obj = { id: pub.id }
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
                    await mergeContext.service.save(pubs);
                }
            } else if (key === 'authorPublications') {
                for (const ap of duplicate[key] ?? []) {
                    let obj = { id: ap['id'] };
                    obj[mergeContext.field] = accumulator;
                    await mergeContext.pubAutrepository.save(obj);
                }
            } else if (key === 'authors' && mergeContext.autField === 'institutes') {
                for (const auth of duplicate[key] ?? []) {
                    let obj = { id: auth['id'] };
                    const institutes = (auth[mergeContext.autField] ?? []).filter(inst => inst.id !== duplicate.id);
                    if (!institutes.find(inst => inst.id === primary.id)) {
                        institutes.push(primary);
                    }
                    obj[mergeContext.autField] = institutes;
                    await mergeContext.autRepository.save(obj)
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
                }
            } else {
                if (!value) accumulator[key] = duplicate[key];
            }
        }
    }

    let saved: TEntity;
    try {
        saved = await repository.save(accumulator as DeepPartial<TEntity>);
    } catch (error) {
        console.log(error)
        return { error: 'update' as MergeError };
    }

    const defaultDelete = async () => {
        if (duplicateIds.length === 0) {
            return;
        }
        await repository.delete(duplicateIds);
    };

    try {
        if (afterSave) {
            await afterSave({ saved, duplicates: presentDuplicates, accumulator, duplicateIds, defaultDelete });
        } else {
            await defaultDelete();
        }
    } catch (error) {
        console.log(error)
        return { error: 'delete' as MergeError };
    }

    return saved;
}
