import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Config } from '../entity/Config';

@Injectable()
export class AppConfigService {

    constructor(@InjectRepository(Config) private repository: Repository<Config>) { }

    public async get(key:string) {
        let res = await this.repository.find({where: {key}});
        if ((!res || res.length===0) && key === 'reporting_year') return new Date().getFullYear();
        else return res[0].value;
    }

    
    setDefaultReportingYear(value:number) {
        this.repository.save({key: 'reporting_year', value: value as any as string})
    }
}

