import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Observable } from 'rxjs';
import { Repository } from 'typeorm';
import { Invoice } from './Invoice.entity';
import { CostType } from './CostType.entity';
import { CostCenter } from './CostCenter.entity';
import { Publication } from '../publication/core/Publication.entity';
import { CostCenterIndex, CostTypeIndex } from '../../../output-interfaces/PublicationIndex';
import { CostTypeService } from './cost-type.service';
import { CostCenterService } from './cost-center.service';

@Injectable()
export class InvoiceService {
    constructor(
        @InjectRepository(Invoice) private repository: Repository<Invoice>,
        private costTypeService: CostTypeService,
        private costCenterService: CostCenterService,
    ) { }

    public get(id: number) {
        return this.repository.findOne({ where: { id } });
    }

    public getForPub(pub: Publication) {
        return this.repository.find({ where: { publication: pub } });
    }

    public save(inv: Invoice[]) {
        return this.repository.save(inv).catch(err => {
            if (err.constraint) throw new BadRequestException(err.detail)
            else throw new InternalServerErrorException(err);
        });
    }

    public delete(insts: Invoice[]) {
        return this.repository.delete(insts.map(p => p.id));
    }

    public getCostTypes() {
        return this.costTypeService.get();
    }

    public getCostTypeIndex(reporting_year: number): Promise<CostTypeIndex[]> {
        return this.costTypeService.getCostTypeIndex(reporting_year);
    }

    public getCostType(id: number, writer: boolean, user?: string) {
        return this.costTypeService.one(id, writer, user);
    }

    public saveCT(ct: CostType, user?: string) {
        return this.costTypeService.save(ct, user);
    }

    public deleteCT(cts: CostType[]) {
        return this.costTypeService.delete(cts);
    }

    public findOrSaveCT(title: string, dryRun = false): Observable<CostType> {
        return this.costTypeService.findOrSave(title, dryRun);
    }

    public findOrSaveCC(title: string, dryRun = false): Observable<CostCenter> {
        return this.costCenterService.findOrSave(title, dryRun);
    }

    public getCostCenters() {
        return this.costCenterService.get();
    }

    public async getCostCenterIndex(reporting_year: number): Promise<CostCenterIndex[]> {
        return this.costCenterService.getCostCenterIndex(reporting_year);
    }

    public getCostCenter(id: number, writer: boolean, user?: string) {
        return this.costCenterService.one(id, writer, user);
    }

    public saveCC(cc: CostCenter, user?: string) {
        return this.costCenterService.save(cc, user);
    }

    public deleteCC(ccs: CostCenter[]) {
        return this.costCenterService.delete(ccs);
    }
}
