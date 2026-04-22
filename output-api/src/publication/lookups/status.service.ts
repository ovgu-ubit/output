import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Status } from './Status.entity';
import { AppConfigService } from '../../config/app-config.service';
import { AbstractEntityService } from '../../common/abstract-entity.service';

@Injectable()
export class StatusService extends AbstractEntityService<Status> {
    constructor(
        @InjectRepository(Status) repository: Repository<Status>,
        configService: AppConfigService,
    ) {
        super(repository, configService);
    }
}
