import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { DeepPartial, FindManyOptions, FindOptionsRelations, FindOptionsWhere, Repository } from 'typeorm';
import { AppConfigService } from '../config/app-config.service';

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

    public async save(entity: DeepPartial<TEntity>) {
        return this.repository.save(entity).catch(err => {
            if (err.constraint) {
                throw new BadRequestException(err.detail);
            }
            throw new InternalServerErrorException(err);
        });
    }
    
    public async update(entity: DeepPartial<TEntity>) {
        return this.save(entity)
    }

    public get() {
        return this.repository.find(this.getFindManyOptions());
    }

    public async one(id: number, writer: boolean) {
        const entity = await this.repository.findOne({
            where: { id } as FindOptionsWhere<TEntity>,
            relations: this.getFindOneRelations(),
        });

        if (!entity) {
            return entity;
        }

        if (!writer) {
            return entity;
        }

        if (!entity.locked_at) {
            await this.lockEntity(entity.id);
            return entity;
        }

        const lockTimeout = await this.configService.get('lock_timeout');
        const lockedAt = entity.locked_at instanceof Date ? entity.locked_at : new Date(entity.locked_at);

        if (lockTimeout && (new Date().getTime() - lockedAt.getTime()) > lockTimeout * 60 * 1000) {
            await this.unlockEntity(entity.id);
            return this.one(id, writer);
        }

        return entity;
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
}
