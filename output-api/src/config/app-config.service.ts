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

    public listDatabaseConfig(key?: string) {
        if (!key) return this.repository.find();
        else return this.repository.findOneBy({ key })
    }

    public async setDatabaseConfig(key: string, value: any) {
        if (!key) return null;
        let row = await this.repository.findOneBy({ key });
        if (!row) return this.repository.save({ key, value })
        else {
            row.value = value
            return this.repository.save(row)
        }
    }

    async reconcileDefaults(defaults: Record<string, unknown>) {
        const wanted = Object.keys(defaults);
        let where = [];
        for (let key of wanted) {
            where.push({ key })
        }

        // schon vorhandene holen
        const existing = await this.repository.find({
            where,
            select: ['key'],
        });
        const have = existing.map((r) => `${r.key}`);

        // fehlende bilden
        let missing = Object.entries(defaults).filter(([key, value]) => {
            return !have.find(e => 
                e == key)
        })
        
        let missing1 = missing.map(([key, value]) =>
            {return { key, value }}
        );

        if (missing1.length) {
            await this.repository.save(missing1);
            // optional: Events/Metrics
        }
    }
}

