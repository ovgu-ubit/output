import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Role } from '../../entity/Role';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RoleService {

    constructor(@InjectRepository(Role) private repository: Repository<Role>, private configService:ConfigService) { }

    public save(pub: any[]) {
        return this.repository.save(pub).catch(err => {
            if (err.constraint) throw new BadRequestException(err.detail)
            else throw new InternalServerErrorException(err);
        });
    }

    public get() {
        return this.repository.find();
    }

    public async one(id:number, writer:boolean) {
        let ct = await this.repository.findOne({where:{id}});
        if (writer && !ct.locked_at) {
            await this.save([{
                id: ct.id,
                locked_at: new Date()
            }]);
        } else if (writer && (new Date().getTime() - ct.locked_at.getTime()) > this.configService.get('lock_timeout') * 60 * 1000) {
            await this.save([{
                id: ct.id,
                locked_at: null
            }]);
            return this.one(id, writer);
        }        
        return ct;
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

