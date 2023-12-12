import { Injectable } from '@nestjs/common';
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
        return this.repository.save(inv);
    }

    public delete(insts:Invoice[]) {
        return this.repository.delete(insts.map(p => p.id));
    }

    public getCostTypes() {
        return this.ctRepository.find();
    }
    
    public getCostType(id:number) {
        return this.ctRepository.findOneBy({id});
    }

    public saveCT(ct:CostType[]) {
        return this.ctRepository.save(ct);
    }

    public deleteCT(cts:CostType[]) {
        return this.ctRepository.delete(cts.map(p => p.id));
    }

    public getCostCenters() {
        return this.ccRepository.find();
    }
    
    public getCostCenter(id:number) {
        return this.ccRepository.findOneBy({id});
    }

    public saveCC(cc:CostCenter[]) {
        return this.ccRepository.save(cc);
    }

    public deleteCC(ccs:CostCenter[]) {
        return this.ccRepository.delete(ccs.map(p => p.id));
    }
}

