import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Config } from './ConfigEntity';
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

    public listDatabaseConfig() {
        return this.repository.find();
    }

    public async setDatabaseConfig(key: string, value: string | null) {
        const entry: Config = { key, value: value ?? null };
        return this.repository.save(entry);
    }
}

