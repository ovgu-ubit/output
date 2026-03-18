import { BadRequestException, Injectable } from '@nestjs/common';
import jsonata from 'jsonata';
import * as Papa from 'papaparse';
import { SearchFilter } from '../../../../output-interfaces/Config';
import { ExportDisposition, ExportFormat, ExportWorkflow, ExportWorkflowStrategy, WorkflowReportItemLevel, WorkflowType } from '../../../../output-interfaces/Workflow';
import { AppConfigService } from '../../config/app-config.service';
import { Publication } from '../../publication/core/Publication.entity';
import { PublicationService } from '../../publication/core/publication.service';
import { PublicationIndex } from '../../../../output-interfaces/PublicationIndex';
import { AbstractFilterService } from '../filter/abstract-filter.service';
import { WorkflowReport } from '../WorkflowReport.entity';
import { WorkflowReportService } from '../workflow-report.service';
import { AbstractExportService } from './abstract-export.service';
import * as XLSX from 'xlsx';
import * as xmljs from 'xml-js';

interface JSONataExportContext {
    publications: Publication[];
    filter?: SearchFilter;
    filter_paths?: string[];
    withMasterData?: boolean;
    params: {
        cfg: Record<string, unknown>;
    };
}

@Injectable()
export class JSONataExportService extends AbstractExportService {

    protected name = 'JSONata-Export';

    private exportDefinition?: ExportWorkflow;
    private config: Record<string, unknown> = {};
    private workflowReport?: WorkflowReport;

    constructor(
        private publicationService: PublicationService,
        private configService: AppConfigService,
        private workflowReportService: WorkflowReportService,
    ) {
        super();
    }

    public async setUp(exportDefinition: ExportWorkflow) {
        if (!exportDefinition?.mapping) {
            throw new BadRequestException('Export workflow mapping is required.');
        }

        this.exportDefinition = exportDefinition;
        this.excel_response = this.resolveFormat() === 'xlsx' && this.resolveDisposition() === 'attachment';
        this.name = exportDefinition.label && exportDefinition.version
            ? `${exportDefinition.label}_v${exportDefinition.version}`
            : exportDefinition.label ?? 'JSONata-Export';
        this.progress = 0;
        this.status_text = 'initialized';

        const config: Record<string, unknown> = {};
        (await this.configService.listDatabaseConfig('admin')).forEach((entry) => {
            config[entry.key] = entry.value;
        });
        (await this.configService.listEnvConfig()).forEach((entry) => {
            config[entry.key] = entry.value;
        });
        this.config = config;

        this.workflowReport = await this.workflowReportService.createReport({
            workflow_type: WorkflowType.EXPORT,
            workflow: this.exportDefinition,
            status: 'initialized',
            params: {
                format: this.resolveFormat(),
                disposition: this.resolveDisposition(),
            }
        });
    }

    public async export(
        filter?: { filter: SearchFilter, paths: string[] },
        filterServices?: AbstractFilterService<PublicationIndex | Publication>[],
        by_user?: string,
        withMasterData?: boolean,
    ) {
        if (!this.exportDefinition?.mapping) {
            throw new BadRequestException('JSONata export workflow is not configured.');
        }
        if (!this.workflowReport?.id) {
            throw new BadRequestException('JSONata export workflow report is not configured.');
        }

        this.status_text = 'Started on ' + new Date();
        this.progress = -1;
        this.workflowReport = await this.workflowReportService.save({
            id: this.workflowReport.id,
            by_user,
            status: 'started',
            started_at: new Date(),
            params: {
                ...this.workflowReport.params as Record<string, unknown>,
                filter: filter?.filter,
                filter_paths: filter?.paths,
                withMasterData: !!withMasterData,
            }
        });

        try {
            let publications = await this.publicationService.getAll(filter?.filter);
            if (filter) {
                for (const path of filter.paths) {
                    const serviceIndex = (await this.configService.get('filter_services'))?.findIndex((entry) => entry.path === path) ?? -1;
                    if (serviceIndex === -1 || !filterServices?.[serviceIndex]) continue;
                    publications = await filterServices[serviceIndex].filter(publications) as Publication[];
                }
            }

            await this.workflowReportService.write(this.workflowReport.id, {
                timestamp: new Date(),
                level: WorkflowReportItemLevel.INFO,
                message: `${publications.length} publications selected for export`
            });

            const context: JSONataExportContext = {
                publications,
                filter: filter?.filter,
                filter_paths: filter?.paths,
                withMasterData: !!withMasterData,
                params: {
                    cfg: this.config,
                }
            };

            const expression = jsonata(this.exportDefinition.mapping);
            const result = await expression.evaluate(context);
            const rendered = this.render(result);

            await this.workflowReportService.write(this.workflowReport.id, {
                timestamp: new Date(),
                level: WorkflowReportItemLevel.INFO,
                message: `Export rendered as ${this.resolveFormat()} with disposition ${this.resolveDisposition()}`
            });

            this.progress = 0;
            await this.workflowReportService.finish(this.workflowReport.id, {
                status: 'Successful export',
                summary: {
                    count_export: publications.length,
                    format: this.resolveFormat(),
                    disposition: this.resolveDisposition(),
                }
            });
            this.status_text = 'Successfull export on ' + new Date();

            return rendered;
        } catch (error) {
            this.progress = 0;
            await this.workflowReportService.write(this.workflowReport.id, {
                timestamp: new Date(),
                level: WorkflowReportItemLevel.ERROR,
                message: `Error while exporting: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`
            });
            await this.workflowReportService.finish(this.workflowReport.id, {
                status: 'Error while exporting',
                summary: {
                    format: this.resolveFormat(),
                    disposition: this.resolveDisposition(),
                }
            });
            this.status_text = 'Error while exporting on ' + new Date();
            throw error;
        }
    }

    private resolveFormat(): ExportFormat {
        return this.getStrategy().format ?? 'json';
    }

    private resolveDisposition(): ExportDisposition {
        return this.getStrategy().disposition ?? (this.resolveFormat() === 'xlsx' ? 'attachment' : 'inline');
    }

    private getStrategy(): ExportWorkflowStrategy {
        return this.exportDefinition?.strategy ?? {};
    }

    private render(value: unknown): string | Buffer {
        switch (this.resolveFormat()) {
            case 'xml':
                return this.renderXml(value);
            case 'csv':
                return this.renderCsv(value);
            case 'xlsx':
                return this.renderXlsx(value);
            case 'json':
            default:
                return this.renderJson(value);
        }
    }

    private renderJson(value: unknown): string {
        if (typeof value === 'string') return value;
        return JSON.stringify(value, null, 2);
    }

    private renderXml(value: unknown): string {
        if (typeof value === 'string') return value;
        const strategy = this.getStrategy();
        const rootName = strategy.root_name ?? 'export';
        return xmljs.js2xml({ [rootName]: value }, { compact: true, spaces: 2 });
    }

    private renderCsv(value: unknown): string {
        if (typeof value === 'string') return value;

        const strategy = this.getStrategy();
        const rows = this.toTabularRows(value);

        return Papa.unparse(rows, {
            delimiter: strategy.delimiter ?? ';',
            quoteChar: strategy.quote_char ?? '"',
            header: rows.length > 0 && typeof rows[0] === 'object' && !Array.isArray(rows[0]),
        });
    }

    private renderXlsx(value: unknown): Buffer {
        const strategy = this.getStrategy();
        const sheetName = strategy.sheet_name ?? 'Export';
        const rows = this.toTabularRows(value);

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }

    private toTabularRows(value: unknown): Record<string, unknown>[] {
        if (Array.isArray(value)) {
            return value.map((entry) => this.toRow(entry));
        }

        if (value && typeof value === 'object') {
            return [this.toRow(value)];
        }

        return [{ value }];
    }

    private toRow(value: unknown): Record<string, unknown> {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return { value };
        }

        return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((row, [key, entry]) => {
            row[key] = this.normalizeCell(entry);
            return row;
        }, {});
    }

    private normalizeCell(value: unknown): unknown {
        if (value instanceof Date) return value.toISOString();
        if (Array.isArray(value) || (value && typeof value === 'object')) return JSON.stringify(value);
        return value;
    }
}
