import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { concatMap, defer, from, iif, Observable, of} from 'rxjs';
import { ILike, Repository } from 'typeorm';
import { Contract } from '../../entity/Contract';
import { CostType } from '../../entity/CostType';

@Injectable()
export class CostTypeService {

    constructor(@InjectRepository(CostType) private repository: Repository<CostType>, private configService:ConfigService) { }

    public get() {
        return this.repository.find();
    }

    public findOrSave(title: string): Observable<CostType> {        
        if (!title) return of(null);
        return from(this.repository.findOne({ where: { label: ILike(title) } })).pipe(concatMap(ge => {
            return iif(() => !!ge, of(ge), defer(() => from(this.repository.save({label: title}))));
        }));
    }
}

