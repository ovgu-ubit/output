import { BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { DeepPartial, FindManyOptions, FindOptionsRelations, FindOptionsWhere, IsNull, LessThan, Repository } from 'typeorm';
import { AppConfigService } from '../config/app-config.service';
import { EditLockOwnerStore, normalizeEditLockDate } from './edit-lock';
import { hasProvidedEntityId } from './entity-id';
import { createEntityLockedHttpException } from './api-error';

export interface LockableEntity {
    id?: number;
    locked_at?: Date | null;
}

export abstract class AbstractEntityService<TEntity extends LockableEntity> {
    protected constructor(
        protected readonly repository: Repository<TEntity>,
        private readonly configService: AppConfigService,
    ) { }

    protected getFindManyOptions(): FindManyOptions<TEntity> {
        return {};
    }

    protected getFindOneRelations(): FindOptionsRelations<TEntity> {
        return {};
    }

    public async save(entity: DeepPartial<TEntity>, _user?: string) {
        return this.repository.save(entity).catch(err => {
            if (err.constraint) {
                throw new BadRequestException(err.detail);
            }
            throw new InternalServerErrorException(err);
        });
    }
    
    public async update(entity: DeepPartial<TEntity>, user?: string) {
        await this.ensureEntityCanBeSaved(entity, user);
        const saved = await this.save(entity, user);
        this.syncLockOwner(entity, user);
        return saved;
    }

    public get() {
        return this.repository.find(this.getFindManyOptions());
    }

    public async one(id: number, writer: boolean, user?: string) {
        const entity = await this.findEntity(id);

        if (!entity) {
            return entity;
        }

        if (!writer) {
            return entity;
        }

        const lockTimeoutMs = await this.getLockTimeoutMs();
        const lockedAt = this.normalizeDate(entity.locked_at);
        const isExpired = !!lockedAt && (Date.now() - lockedAt.getTime()) > lockTimeoutMs;

        if (lockedAt && !isExpired) {
            if (user && EditLockOwnerStore.getOwner(this.getEditLockScope(), entity.id) === user) {
                return {
                    ...entity,
                    locked_at: undefined,
                };
            }
            return entity;
        }

        const now = new Date();
        const lockCriteria = !lockedAt
            ? { id: entity.id, locked_at: IsNull() }
            : { id: entity.id, locked_at: LessThan(new Date(now.getTime() - lockTimeoutMs)) };

        const updateResult = await this.repository.update(
            lockCriteria as FindOptionsWhere<TEntity>,
            { locked_at: now } as never,
        );

        if (!updateResult.affected) {
            return (await this.findEntity(id)) ?? entity;
        }

        if (user && hasProvidedEntityId(entity.id)) {
            EditLockOwnerStore.setOwner(this.getEditLockScope(), entity.id, user);
        }

        return {
            ...entity,
            locked_at: undefined,
        };
    }

    public delete(entities: TEntity[]) {
        return this.repository.delete(entities.map(entity => entity.id));
    }

    public normalizeForCreate(entity: TEntity): TEntity {
        const normalized = entity as unknown as { id?: number | null | '' };
        if (normalized && !hasProvidedEntityId(normalized.id)) {
            normalized.id = undefined;
        }
        return entity;
    }

    protected async lockEntity(id: number) {
        await this.save({ id, locked_at: new Date() } as DeepPartial<TEntity>);
    }

    protected async unlockEntity(id: number) {
        await this.save({ id, locked_at: null } as DeepPartial<TEntity>);
    }

    protected async ensureEntityCanBeSaved(entity: DeepPartial<TEntity>, user?: string): Promise<void> {
        if (!hasProvidedEntityId(entity?.id)) return;

        const dbEntity = await this.repository.findOne({
            where: { id: entity.id } as FindOptionsWhere<TEntity>,
        });
        if (!hasProvidedEntityId(dbEntity?.id)) return;

        if (!dbEntity.locked_at) {
            this.releaseEditLock(dbEntity.id);
            return;
        }

        const lockTimeoutMs = await this.getLockTimeoutMs();
        const lockedAt = this.normalizeDate(dbEntity.locked_at);
        if (!lockedAt || (Date.now() - lockedAt.getTime()) > lockTimeoutMs) {
            this.releaseEditLock(dbEntity.id);
            return;
        }

        const owner = EditLockOwnerStore.getOwner(this.getEditLockScope(), dbEntity.id);
        if (this.isUnlockOnlyRequest(entity)) {
            if (user && owner === user) {
                this.releaseEditLock(dbEntity.id);
                return;
            }
            throw createEntityLockedHttpException();
        }

        if (!user || owner !== user) {
            throw createEntityLockedHttpException();
        }
    }

    private async findEntity(id: number): Promise<TEntity | null> {
        return this.repository.findOne({
            where: { id } as FindOptionsWhere<TEntity>,
            relations: this.getFindOneRelations(),
        });
    }

    private async getLockTimeoutMs(): Promise<number> {
        const timeoutInMinutes = Number(await this.configService.get('lock_timeout'));
        const resolvedMinutes = Number.isFinite(timeoutInMinutes) && timeoutInMinutes >= 0 ? timeoutInMinutes : 5;
        return resolvedMinutes * 60 * 1000;
    }

    private normalizeDate(value?: Date | null): Date | null {
        return normalizeEditLockDate(value);
    }

    private isUnlockOnlyRequest(entity: DeepPartial<TEntity>): boolean {
        const keys = Object.keys(entity).filter((key) => entity[key] !== undefined);
        return hasProvidedEntityId(entity?.id)
            && entity.locked_at === null
            && keys.length > 0
            && keys.every((key) => key === 'id' || key === 'locked_at');
    }

    private syncLockOwner(entity: DeepPartial<TEntity>, user?: string): void {
        if (!hasProvidedEntityId(entity?.id)) return;
        const hasExplicitLockState = Object.prototype.hasOwnProperty.call(entity, 'locked_at');
        if (hasExplicitLockState && !entity.locked_at) {
            this.releaseEditLock(entity.id);
            return;
        }
        if (user) {
            EditLockOwnerStore.setOwner(this.getEditLockScope(), entity.id, user);
        }
    }

    private releaseEditLock(id: number): void {
        EditLockOwnerStore.release(this.getEditLockScope(), id);
    }

    private getEditLockScope(): string {
        return (this.repository as { metadata?: { tableName?: string } }).metadata?.tableName ?? 'entity';
    }
}
