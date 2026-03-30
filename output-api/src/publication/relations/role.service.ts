import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Role } from './Role.entity';
import { AppConfigService } from '../../config/app-config.service';
import { AbstractEntityService } from '../../common/abstract-entity.service';

@Injectable()
export class RoleService extends AbstractEntityService<Role> {
    constructor(
        @InjectRepository(Role) repository: Repository<Role>,
        configService: AppConfigService,
    ) {
        super(repository, configService);
    }

    public async findOrSave(label: string, dryRun = false): Promise<Role> {
        if (!label) return null;
        const role:Role = await this.repository.findOne({ where: { label: ILike('%'+label+'%') } });
        if (role || dryRun) return role;
        else return await this.repository.save({ label }).catch(e => { throw { origin: 'role-service', text: `Role ${label} could not be inserted` }; });
    }
}
