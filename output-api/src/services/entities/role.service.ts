import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Language } from '../../entity/Language';
import { Role } from '../../entity/Role';

@Injectable()
export class RoleService {

    constructor(@InjectRepository(Role) private repository: Repository<Role>) { }

    public save(pub: Role[]) {
        return this.repository.save(pub).catch(err => {
            if (err.constraint) throw new BadRequestException(err.detail)
            else throw new InternalServerErrorException(err);
        });
    }

    public get() {
        return this.repository.find();
    }

    public one(id:number) {
        return this.repository.findOne({where:{id}});
    }

    public async findOrSave(label: string): Promise<Role> {
        if (!label) return null;
        let funder: Role;
        funder = await this.repository.findOne({ where: { label: ILike('%'+label+'%') } });
        if (funder) return funder;
        else return await this.repository.save({ label }).catch(e => { throw { origin: 'role-service', text: `Role ${label} could not be inserted` }; });
    }

    public delete(insts:Role[]) {
        return this.repository.delete(insts.map(p => p.id));
    }
}

