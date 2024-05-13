import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { concatMap, defer, from, iif, Observable, of} from 'rxjs';
import { ILike, Repository } from 'typeorm';
import { Contract } from '../../entity/Contract';
import { CostType } from '../../entity/CostType';
import { Invoice } from '../../entity/Invoice';
import { Publication } from '../../entity/Publication';
import { CostCenter } from '../../entity/CostCenter';

@Injectable()
export class InvoiceService {

    constructor(@InjectRepository(Invoice) private repository: Repository<Invoice>, private configService:ConfigService,
    @InjectRepository(CostType) private ctRepository: Repository<CostType>,
    @InjectRepository(CostCenter) private ccRepository: Repository<CostCenter>) { }

    public get(id:number) {
        return this.repository.findOne({where: {id}});
    }

    public getForPub(pub:Publication) {
        return this.repository.find({where: {publication : pub}});
    }

    public save(inv: Invoice[]) {
        return this.repository.save(inv).catch(err => {
            if (err.constraint) throw new BadRequestException(err.detail)
            else throw new InternalServerErrorException(err);
        });
    }

    public delete(insts:Invoice[]) {
        return this.repository.delete(insts.map(p => p.id));
    }

    public getCostTypes() {
        return this.ctRepository.find();
    }
    
    public async getCostType(id:number, writer:boolean) {
        let ct = await this.ctRepository.findOneBy({id});
        
        if (writer && !ct.locked_at) {
            await this.saveCT([{
                id: ct.id,
                locked_at: new Date()
            }]);
        } else if (writer && (new Date().getTime() - ct.locked_at.getTime()) > this.configService.get('lock_timeout') * 60 * 1000) {
            await this.saveCT([{
                id: ct.id,
                locked_at: null
            }]);
            return this.getCostType(id, writer);
        }        
        return ct;
    }

    public saveCT(ct:any[]) {
        return this.ctRepository.save(ct).catch(err => {
            if (err.constraint) throw new BadRequestException(err.detail)
            else throw new InternalServerErrorException(err);
        });
    }

    public deleteCT(cts:CostType[]) {
        return this.ctRepository.delete(cts.map(p => p.id));
    }

    public getCostCenters() {
        return this.ccRepository.find();
    }
    
    public async getCostCenter(id:number, writer: boolean) {
        let cc = await this.ccRepository.findOne({where:{id}});
        
        if (writer && !cc.locked_at) {
            await this.saveCC([{
                id: cc.id,
                locked_at: new Date()
            }]);
        } else if (writer && (new Date().getTime() - cc.locked_at.getTime()) > this.configService.get('lock_timeout') * 60 * 1000) {
            await this.saveCC([{
                id: cc.id,
                locked_at: null
            }]);
            return this.getCostCenter(id, writer);
        }        
        return cc;
    }

    public saveCC(cc:any[]) {
        return this.ccRepository.save(cc).catch(err => {
            if (err.constraint) throw new BadRequestException(err.detail)
            else throw new InternalServerErrorException(err);
        });
    }

    public deleteCC(ccs:CostCenter[]) {
        return this.ccRepository.delete(ccs.map(p => p.id));
    }
}

