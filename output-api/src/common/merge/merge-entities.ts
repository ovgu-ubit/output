import { DeepPartial, FindOptionsRelations, FindOptionsWhere, Repository } from 'typeorm';

export type MergeError = 'find' | 'update' | 'delete';

export interface MergeValidationContext<TEntity extends { id?: number | null }> {
    primary: TEntity;
    duplicates: TEntity[];
    duplicateIds: number[];
}

export interface MergeDuplicateContext<TEntity extends { id?: number | null }, TAccumulator> {
    primary: TEntity;
    duplicate: TEntity;
    duplicates: TEntity[];
    accumulator: TAccumulator;
    index: number;
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
    initializeAccumulator?: (primary: TEntity) => Promise<TAccumulator> | TAccumulator;
    mergeDuplicate: (context: MergeDuplicateContext<TEntity, TAccumulator>) => Promise<void> | void;
    beforeSave?: (context: MergeFinalizeContext<TEntity, TAccumulator>) => Promise<void> | void;
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
        initializeAccumulator,
        mergeDuplicate,
        beforeSave,
        afterSave,
        validate,
    } = options;

    const primary = await repository.findOne({ where: { id: primaryId } as FindOptionsWhere<TEntity>, relations: primaryRelations });
    if (!primary) {
        return { error: 'find' as MergeError };
    }

    const duplicates = await Promise.all(
        duplicateIds.map(id => repository.findOne({ where: { id } as FindOptionsWhere<TEntity>, relations: duplicateRelations ?? primaryRelations ?? {} })),
    );

    if (duplicates.some(duplicate => !duplicate)) {
        return { error: 'find' as MergeError };
    }

    const presentDuplicates = duplicates as TEntity[];

    if (validate) {
        const validationError = await validate({ primary, duplicates: presentDuplicates, duplicateIds });
        if (validationError) {
            return { error: validationError };
        }
    }

    const accumulator = initializeAccumulator
        ? await initializeAccumulator(primary)
        : ({ ...(primary as unknown as Record<string, unknown>) } as TAccumulator);

    for (let index = 0; index < presentDuplicates.length; index++) {
        const duplicate = presentDuplicates[index];
        await mergeDuplicate({ primary, duplicate, duplicates: presentDuplicates, accumulator, index });
    }

    if (beforeSave) {
        await beforeSave({ primary, duplicates: presentDuplicates, accumulator });
    }

    let saved: TEntity;
    try {
        saved = await repository.save(accumulator as DeepPartial<TEntity>);
    } catch (error) {
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
        return { error: 'delete' as MergeError };
    }

    return saved;
}
