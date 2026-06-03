import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, FindOptionsWhere, Repository } from 'typeorm';
import { Status } from './Status.entity';
import { AppConfigService } from '../../config/app-config.service';
import { AbstractEntityService } from '../../common/abstract-entity.service';
import { createInvalidRequestHttpException, createUniqueConstraintHttpException } from '../../common/api-error';
import { hasProvidedEntityId } from '../../common/entity-id';

@Injectable()
export class StatusService extends AbstractEntityService<Status> {
    constructor(
        @InjectRepository(Status) repository: Repository<Status>,
        configService: AppConfigService,
    ) {
        super(repository, configService);
    }

    public async create(status: DeepPartial<Status>): Promise<Status> {
        if (!hasProvidedEntityId(status?.id)) {
            throw createInvalidRequestHttpException('id is required for status create requests', [
                {
                    path: 'id',
                    code: 'required_id',
                    message: 'id is required for status create requests',
                },
            ]);
        }

        const existing = await this.repository.findOne({
            where: { id: status.id } as FindOptionsWhere<Status>,
        });
        if (existing) {
            throw createUniqueConstraintHttpException('Status id already exists.');
        }

        return this.save(status);
    }
}
