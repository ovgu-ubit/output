import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { spawn, type SpawnOptionsWithoutStdio } from 'child_process';
import * as fs from 'fs';
import { DataSource, QueryRunner } from 'typeorm';
import { AppConfigService } from '../config/app-config.service';
import { CONFIG_DEFAULTS, CONFIG_DESCRIPTIONS, CONFIG_SCOPES } from '../config/config.defaults';

export const DEMO_RESET_PROCESS_RUNNER = Symbol('DEMO_RESET_PROCESS_RUNNER');
export const DEMO_RESET_CRON = '0 0 3 * * *';
export const DEMO_RESET_TIME_ZONE = 'Europe/Berlin';

const DEMO_RESET_LOCK_ID = 3303003;
const MIGRATIONS_TABLE = 'migrations';

export type DemoResetProcessRunner = (args: string[], env: NodeJS.ProcessEnv) => Promise<void>;
type DemoResetReason = 'startup' | 'scheduled';

export async function runPsqlProcess(args: string[], env: NodeJS.ProcessEnv): Promise<void> {
    const options: SpawnOptionsWithoutStdio = {
        env,
        windowsHide: true
    };

    await new Promise<void>((resolve, reject) => {
        const child = spawn('psql', args, options);
        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', data => {
            stdout += data.toString();
        });
        child.stderr?.on('data', data => {
            stderr += data.toString();
        });
        child.on('error', reject);
        child.on('close', code => {
            if (code === 0) {
                resolve();
                return;
            }

            const output = [stdout.trim(), stderr.trim()].filter(Boolean).join('\n');
            reject(new Error(`psql exited with code ${code}${output ? `:\n${output}` : ''}`));
        });
    });
}

@Injectable()
export class DemoResetService {
    private readonly logger = new Logger(DemoResetService.name);

    constructor(
        private readonly configService: AppConfigService,
        @InjectDataSource() private readonly dataSource: DataSource,
        @Inject(DEMO_RESET_PROCESS_RUNNER) private readonly processRunner: DemoResetProcessRunner
    ) { }

    public async resetOnStartup(): Promise<void> {
        await this.resetDemoDatabase('startup');
    }

    @Cron(DEMO_RESET_CRON, { timeZone: DEMO_RESET_TIME_ZONE })
    public async resetOnSchedule(): Promise<void> {
        try {
            await this.resetDemoDatabase('scheduled');
        } catch (error) {
            this.logger.error('Scheduled demo database reset failed.', this.formatError(error));
        }
    }

    public async resetDemoDatabase(reason: DemoResetReason): Promise<boolean> {
        if (!await this.isDemoMode()) return false;

        const sqlPath = await this.requiredConfig('DEMO_RESET_SQL_PATH');
        this.assertSnapshotFile(sqlPath);

        this.logger.log(`Starting demo database reset (${reason}).`);
        await this.withResetLock(async queryRunner => {
            const prepareImportSql = await this.buildPrepareImportSql(queryRunner);
            const restoreConstraintSql = this.buildRestoreConstraintSql();
            const args = await this.buildPsqlArgs(sqlPath, prepareImportSql, restoreConstraintSql);
            const env = await this.buildPsqlEnv();
            await this.processRunner(args, env);
        });
        await this.reconcileApplicationConfig();
        this.logger.log(`Finished demo database reset (${reason}).`);

        return true;
    }

    protected isReadableFile(path: string): boolean {
        return fs.existsSync(path) && fs.statSync(path).isFile();
    }

    private async isDemoMode(): Promise<boolean> {
        return this.isTruthy(await this.configService.get('DEMO_MODE'));
    }

    private async requiredConfig(key: string): Promise<string> {
        const value = await this.configService.get(key);
        if (value === undefined || value === null || value === '') {
            throw new Error(`${key} is required for the demo database reset.`);
        }

        return `${value}`;
    }

    private assertSnapshotFile(sqlPath: string): void {
        if (!this.isReadableFile(sqlPath)) {
            throw new Error(`Demo reset SQL snapshot does not exist or is not a file: ${sqlPath}`);
        }
    }

    private async withResetLock(callback: (queryRunner: QueryRunner) => Promise<void>): Promise<void> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();

        let locked = false;
        try {
            await queryRunner.query('SELECT pg_advisory_lock($1)', [DEMO_RESET_LOCK_ID]);
            locked = true;
            await callback(queryRunner);
        } finally {
            if (locked) {
                try {
                    await queryRunner.query('SELECT pg_advisory_unlock($1)', [DEMO_RESET_LOCK_ID]);
                } catch (error) {
                    this.logger.error('Failed to release demo database reset lock.', this.formatError(error));
                }
            }
            await queryRunner.release();
        }
    }

    private async buildPrepareImportSql(queryRunner: QueryRunner): Promise<string> {
        const rows = await queryRunner.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_type = 'BASE TABLE'
              AND table_name <> $1
            ORDER BY table_name
        `, [MIGRATIONS_TABLE]) as Array<{ table_name: string }>;

        const tableNames = rows
            .map(row => row.table_name)
            .filter(tableName => tableName && tableName !== MIGRATIONS_TABLE);

        if (!tableNames.length) return 'SELECT 1;';

        const quotedTables = tableNames
            .map(tableName => `${this.quoteIdentifier('public')}.${this.quoteIdentifier(tableName)}`)
            .join(', ');

        return `
            CREATE TEMP TABLE demo_reset_fk_constraints ON COMMIT DROP AS
            SELECT format('%I.%I', table_namespace.nspname, table_class.relname) AS table_name,
                   constraint_info.conname AS constraint_name,
                   constraint_info.condeferrable AS condeferrable,
                   constraint_info.condeferred AS condeferred
            FROM pg_constraint constraint_info
            JOIN pg_class table_class ON table_class.oid = constraint_info.conrelid
            JOIN pg_namespace table_namespace ON table_namespace.oid = table_class.relnamespace
            WHERE constraint_info.contype = 'f'
              AND constraint_info.connamespace = 'public'::regnamespace;

            DO $$
            DECLARE constraint_row record;
            BEGIN
                FOR constraint_row IN
                    SELECT table_name, constraint_name
                    FROM pg_temp.demo_reset_fk_constraints
                LOOP
                    EXECUTE format(
                        'ALTER TABLE %s ALTER CONSTRAINT %I DEFERRABLE INITIALLY DEFERRED',
                        constraint_row.table_name,
                        constraint_row.constraint_name
                    );
                END LOOP;
            END $$;
            SET CONSTRAINTS ALL DEFERRED;
            TRUNCATE TABLE ${quotedTables} RESTART IDENTITY CASCADE;
        `;
    }

    private buildRestoreConstraintSql(): string {
        return `
            SET CONSTRAINTS ALL IMMEDIATE;
            DO $$
            DECLARE constraint_row record;
            DECLARE deferrability_sql text;
            BEGIN
                FOR constraint_row IN
                    SELECT table_name, constraint_name, condeferrable, condeferred
                    FROM pg_temp.demo_reset_fk_constraints
                LOOP
                    IF constraint_row.condeferrable AND constraint_row.condeferred THEN
                        deferrability_sql := 'DEFERRABLE INITIALLY DEFERRED';
                    ELSIF constraint_row.condeferrable THEN
                        deferrability_sql := 'DEFERRABLE INITIALLY IMMEDIATE';
                    ELSE
                        deferrability_sql := 'NOT DEFERRABLE';
                    END IF;

                    EXECUTE format(
                        'ALTER TABLE %s ALTER CONSTRAINT %I %s',
                        constraint_row.table_name,
                        constraint_row.constraint_name,
                        deferrability_sql
                    );
                END LOOP;
            END $$;
        `;
    }

    private async buildPsqlArgs(sqlPath: string, prepareImportSql: string, restoreConstraintSql: string): Promise<string[]> {
        return [
            '--host', await this.requiredConfig('DATABASE_HOST'),
            '--port', await this.requiredConfig('DATABASE_PORT'),
            '--username', await this.requiredConfig('DATABASE_USER'),
            '--dbname', await this.requiredConfig('DATABASE_NAME'),
            '--no-password',
            '--single-transaction',
            '-v', 'ON_ERROR_STOP=1',
            '--command', prepareImportSql,
            '--file', sqlPath,
            '--command', restoreConstraintSql
        ];
    }

    private async buildPsqlEnv(): Promise<NodeJS.ProcessEnv> {
        return {
            ...process.env,
            PGPASSWORD: await this.requiredConfig('DATABASE_PASSWORD')
        };
    }

    private async reconcileApplicationConfig(): Promise<void> {
        await this.configService.reconcileDefaults(CONFIG_DEFAULTS, CONFIG_DESCRIPTIONS, CONFIG_SCOPES);
        await this.configService.normalizeAtomicArrayValues(['ror_id', 'openalex_id']);
    }

    private quoteIdentifier(identifier: string): string {
        return `"${identifier.replace(/"/g, '""')}"`;
    }

    private isTruthy(value: unknown): boolean {
        if (typeof value === 'boolean') return value;
        if (typeof value !== 'string') return false;
        return ['true', '1'].includes(value.trim().toLowerCase());
    }

    private formatError(error: unknown): string {
        if (error instanceof Error) return error.stack ?? error.message;
        return String(error);
    }
}
