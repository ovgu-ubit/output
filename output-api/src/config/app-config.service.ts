import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Not, Repository } from 'typeorm';
import { Config, ConfigScope } from './Config.entity';
import { ConfigService } from '@nestjs/config';
import { HealthState } from '../../../output-interfaces/Config';

@Injectable()
export class AppConfigService {

    constructor(@InjectRepository(Config) private repository: Repository<Config>,
        private configService: ConfigService, @InjectDataSource() private readonly dataSource: DataSource) { }

    public async get(key: string) {
        if (key === 'APP_CONFIG_PATH' && ["true","1"].includes(this.configService.get('APP_DOCKER_MODE'))) return "./config/"
        if (key === 'APP_LOG_PATH' && ["true","1"].includes(this.configService.get('APP_DOCKER_MODE'))) return "./log/"
        let res = this.configService.get(key);
        if (res) return res;
        else {
            res = await this.repository.find({ where: { key } });
            if ((!res || res.length === 0) && key === 'reporting_year') return new Date().getFullYear();
            else return res[0]?.value;
        }
    }

    public listDatabaseConfig(key?: string, scope: ConfigScope = 'public') {
        const allowedScopes = this.resolveAllowedScopes(scope);

        if (!key) return this.repository.find({ where: { scope: In(allowedScopes) }, order: { key: 'ASC' } });
        else return this.repository.findOne({ where: { key, scope: In(allowedScopes) } });
    }

    public async setDatabaseConfig(key: string, value: any) {
        if (!key) return null;
        const row = await this.repository.findOneBy({ key });
        if (!row) return this.repository.save({ key, value, scope: 'admin' })
        else {
            row.value = value
            return this.repository.save(row)
        }
    }

    async reconcileDefaults(defaults: Record<string, unknown>, descriptions: Record<string, string>, scopes: Record<string, ConfigScope> = {}) {
        // schon vorhandene holen
        const existing = await this.repository.find({
            select: ['id', 'key', 'scope']
        });
        const have = existing.map((r) => `${r.key}`);

        const existingNull = await this.repository.find({
            select: ['id', 'key', 'scope'],
            where: {value: IsNull()}
        });
        //reconcile defaults for null values
        const defaultNull = existingNull.map(e => {return {...e, value: defaults[e.key]}})
        if (defaultNull.length) {
            await this.repository.save(defaultNull)
        }

        // fehlende bilden
        const missing = Object.entries(defaults).filter(([key, _value]) => {
            return !have.find(e =>
                e == key)
        })

        const missing1 = missing.map(([key, value]) => {
            return { key, value, description: descriptions[key], scope: scopes[key] ?? 'admin' };
        });

        if (missing1.length) {
            await this.repository.save(missing1);
        }

        // add missing or changed descriptions and scopes
        for (const { id, key, scope } of existing) {
            const updates: Partial<Config> = { id };
            if (key in descriptions) {
                updates.description = descriptions[key];
            }
            const defaultScope = scopes[key];
            if (defaultScope && scope !== defaultScope) {
                updates.scope = defaultScope;
            }
            if (updates.description !== undefined || updates.scope) {
                await this.repository.save(updates);
            }
        }

        // delete old or wrong keys
        const over = have.filter(key => !Object.keys(defaults).find(e => e === key))
        if (over.length) await this.repository.delete({ key: In(over) });
    }

    private resolveAllowedScopes(scope: ConfigScope): ConfigScope[] {
        if (scope === 'admin') return ['public', 'user', 'admin'];
        if (scope === 'user') return ['public', 'user'];
        return ['public'];
    }

    async checkHealth() {
        const state: HealthState = {
            status: "ok",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            checks: {
                database: "up"
            }
        };
        try {
            if (!this.dataSource.isInitialized) {
                await this.dataSource.initialize();
            }
            await this.dataSource.query("SELECT 1");
            return state;
        } catch (error) {
            state.status = "error";
            state.checks.database = "down";
            let trace: string;
            if (error instanceof Error) trace = error.stack ?? error.message;
            else {
                try {
                    trace = JSON.stringify(error);
                } catch (stringifyError) {
                    trace = String(error ?? stringifyError);
                }
            }
            console.error("Database health check failed", trace);
            throw new ServiceUnavailableException(state);
        }
    }
}

