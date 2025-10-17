import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { concatMap, defer, from, iif, Observable, of } from 'rxjs';
import { ILike, Repository } from 'typeorm';
import { Invoice } from './Invoice';
import { CostType } from './CostType';
import { CostCenter } from './CostCenter';
import { Publication } from '../publication/core/Publication';
import { CostCenterIndex, CostTypeIndex } from '../../../output-interfaces/PublicationIndex';

@Injectable()
export class InvoiceService {

    constructor(@InjectRepository(Invoice) private repository: Repository<Invoice>, private configService: ConfigService,
        @InjectRepository(CostType) private ctRepository: Repository<CostType>,
        @InjectRepository(CostCenter) private ccRepository: Repository<CostCenter>) { }

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
        return this.ctRepository.find();
    }

    public getCostTypeIndex(reporting_year: number) {
        let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
        let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));

        let query = this.ctRepository.createQueryBuilder("cost_type")
            .leftJoin("cost_item", "cost_item", "cost_item.\"costTypeId\"=cost_type.id")
            .leftJoin("invoice", "invoice", "cost_item.\"invoiceId\"=invoice.id")
            .leftJoin("invoice.publication", "publication", "publication.pub_date between :beginDate and :endDate", { beginDate, endDate })
            .select("cost_type.id", "id")
            .addSelect("cost_type.label", "label")
            .addSelect("COUNT(DISTINCT publication.id)", "pub_count")
            .groupBy("cost_type.id")
            .addGroupBy("cost_type.label")

        return query.getRawMany() as Promise<CostTypeIndex[]>;
    }

    public async getCostType(id: number, writer: boolean) {
        let ct = await this.ctRepository.findOneBy({ id });

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

    public saveCT(ct: any[]) {
        return this.ctRepository.save(ct).catch(err => {
            if (err.constraint) throw new BadRequestException(err.detail)
            else throw new InternalServerErrorException(err);
        });
    }

    public deleteCT(cts: CostType[]) {
        return this.ctRepository.delete(cts.map(p => p.id));
    }

    public findOrSaveCT(title: string): Observable<CostType> {
        if (!title) return of(null);
        return from(this.ctRepository.findOne({ where: { label: ILike(title) } })).pipe(concatMap(ge => {
            return iif(() => !!ge, of(ge), defer(() => from(this.ctRepository.save({ label: title }))));
        }));
    }

    public findOrSaveCC(title: string): Observable<CostCenter> {
        if (!title) return of(null);
        return from(this.ccRepository.findOne({ where: [{ label: ILike(title) }, { number: ILike(title) }] })).pipe(concatMap(ge => {
            return iif(() => !!ge, of(ge), defer(() => from(this.ccRepository.save({ label: title }))));
        }));
    }

    public getCostCenters() {
        return this.ccRepository.find();
    }

    public async getCostCenterIndex(reporting_year: number): Promise<CostCenterIndex[]> {
        if (!reporting_year || Number.isNaN(reporting_year)) reporting_year = Number(await this.configService.get('reporting_year'));
        let beginDate = new Date(Date.UTC(reporting_year, 0, 1, 0, 0, 0, 0));
        let endDate = new Date(Date.UTC(reporting_year, 11, 31, 23, 59, 59, 999));
        let query = this.ccRepository.createQueryBuilder("cost_center")
            .leftJoin("invoice", "invoice", "invoice.\"costCenterId\"=cost_center.id")
            .leftJoin("invoice.publication", "publication", "publication.pub_date between :beginDate and :endDate", { beginDate, endDate })
            .select("cost_center.id", "id")
            .addSelect("cost_center.label", "label")
            .addSelect("cost_center.number", "number")
            .addSelect("COUNT(DISTINCT publication.id)", "pub_count")
            .groupBy("cost_center.id")
            .addGroupBy("cost_center.label")
            .addGroupBy("cost_center.number")

        //console.log(query.getSql());

        return query.getRawMany() as Promise<CostCenterIndex[]>;
    }

    public async getCostCenter(id: number, writer: boolean) {
        let cc = await this.ccRepository.findOne({ where: { id } });

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

    public saveCC(cc: any[]) {
        return this.ccRepository.save(cc).catch(err => {
            if (err.constraint) throw new BadRequestException(err.detail)
            else throw new InternalServerErrorException(err);
        });
    }

    public deleteCC(ccs: CostCenter[]) {
        return this.ccRepository.delete(ccs.map(p => p.id));
    }
}

