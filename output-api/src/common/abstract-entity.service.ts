import { BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { DeepPartial, FindManyOptions, FindOptionsRelations, FindOptionsWhere, IsNull, LessThan, Repository } from 'typeorm';
import { AppConfigService } from '../config/app-config.service';

export interface LockableEntity {
    id?: number;
    locked_at?: Date | null;
}

export abstract class AbstractEntityService<TEntity extends LockableEntity> {
    private readonly editLockOwners = new Map<string, string>();

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
        this.syncLockOwner(saved as DeepPartial<TEntity>, user);
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
        const lockKey = this.getEditLockKey(entity.id);
        const isExpired = !!lockedAt && (Date.now() - lockedAt.getTime()) > lockTimeoutMs;

        if (lockedAt && !isExpired) {
            if (user && this.editLockOwners.get(lockKey) === user) {
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

        if (user && entity.id) {
            this.editLockOwners.set(lockKey, user);
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
        const normalized = entity as unknown as { id?: number | null };
        if (normalized && !normalized.id) {
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
        if (!entity?.id) return;

        const dbEntity = await this.repository.findOne({
            where: { id: entity.id } as FindOptionsWhere<TEntity>,
        });
        if (!dbEntity?.id) return;

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

        const owner = this.editLockOwners.get(this.getEditLockKey(dbEntity.id));
        if (this.isUnlockOnlyRequest(entity)) {
            if (user && owner === user) {
                this.releaseEditLock(dbEntity.id);
                return;
            }
            throw new ConflictException('Entity is currently locked.');
        }

        if (!user || owner !== user) {
            throw new ConflictException('Entity is currently locked.');
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
        if (!value) return null;
        return value instanceof Date ? value : new Date(value);
    }

    private isUnlockOnlyRequest(entity: DeepPartial<TEntity>): boolean {
        const keys = Object.keys(entity).filter((key) => entity[key] !== undefined);
        return !!entity?.id
            && entity.locked_at === null
            && keys.length > 0
            && keys.every((key) => key === 'id' || key === 'locked_at');
    }

    private syncLockOwner(entity: DeepPartial<TEntity>, user?: string): void {
        if (!entity?.id) return;
        if (!entity.locked_at) {
            this.releaseEditLock(entity.id);
            return;
        }
        if (user) {
            this.editLockOwners.set(this.getEditLockKey(entity.id), user);
        }
    }

    private releaseEditLock(id: number): void {
        this.editLockOwners.delete(this.getEditLockKey(id));
    }

    private getEditLockKey(id?: number): string {
        const tableName = (this.repository as { metadata?: { tableName?: string } }).metadata?.tableName ?? 'entity';
        return `${tableName}:${id ?? 'unknown'}`;
    }
}
