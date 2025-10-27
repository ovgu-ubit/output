import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Config } from './Config.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {

    constructor(@InjectRepository(Config) private repository: Repository<Config>,
        private configService: ConfigService) { }

    public async get(key: string) {
        let res = this.configService.get(key);
        if (res) return res;
        else {
            res = await this.repository.find({ where: { key } });
            if ((!res || res.length === 0) && key === 'reporting_year') return new Date().getFullYear();
            else return res[0]?.value;
        }
    }

    setDefaultReportingYear(value: number) {
        this.repository.save({ key: 'reporting_year', value: value as any as string })
    }

    public async listDatabaseConfig(key?: string) {
        let db;
        if (!key) db = await this.repository.find();
        else db = await this.repository.findBy({ key })
        let res = db.reduce((acc, c) => {
            if (!acc[c.key]) acc[c.key] = [];
            acc[c.key].push(c.value)
            return acc;
        }, {})
        return Object.entries(res).map(([key, values]) => ({ key, values }));
    }

    public async setDatabaseConfig(key: string, values: (string | null)[]) {
        await this.repository.delete({ key })
        if (["test"].some(e => e === key)) {
            for (let v of values) {
                await this.repository.save({ key, value: v })
            }
        } else {
            await this.repository.save({ key, value: values[0] })
        }
        return this.listDatabaseConfig(key)
    }
}

