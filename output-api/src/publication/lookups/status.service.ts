import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Status } from './Status.entity';
import { AppConfigService } from '../../config/app-config.service';

@Injectable()
export class StatusService {

    constructor(@InjectRepository(Status) private repository: Repository<Status>, private configService:AppConfigService) { }

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
        } else if (writer && (new Date().getTime() - ct.locked_at.getTime()) > await this.configService.get('lock_timeout') * 60 * 1000) {
            await this.save([{
                id: ct.id,
                locked_at: null
            }]);
            return this.one(id, writer);
        }        
        return ct;
    }

    public delete(insts:Status[]) {
        return this.repository.delete(insts.map(p => p.id));
    }
}

