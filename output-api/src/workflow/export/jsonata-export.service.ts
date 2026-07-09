import { HttpException, Injectable } from '@nestjs/common';
import jsonata from 'jsonata';
import * as Papa from 'papaparse';
import {  SearchFilter  } from '@output/interfaces';
import {  ExportDisposition, ExportFormat, ExportWorkflow, WorkflowReportItemLevel, WorkflowType  } from '@output/interfaces';
import { AuthorService } from '../../author/author.service';
import { AppConfigService } from '../../config/app-config.service';
import { ContractService } from '../../contract/contract.service';
import { FunderService } from '../../funder/funder.service';
import { GreaterEntityService } from '../../greater_entity/greater-entitiy.service';
import { InstituteService } from '../../institute/institute.service';
import { InvoiceService } from '../../invoice/invoice.service';
import { OACategoryService } from '../../oa_category/oa-category.service';
import { Publication } from '../../publication/core/Publication.entity';
import { PublicationIndexService } from '../../publication/core/publication-index.service';
import { PublicationTypeService } from '../../pub_type/publication-type.service';
import { PublisherService } from '../../publisher/publisher.service';
import {  PublicationIndex  } from '@output/interfaces';
import { createInvalidRequestHttpException } from '../../common/api-error';
import { hasProvidedEntityId } from '../../common/entity-id';
import { AbstractFilterService } from '../filter/abstract-filter.service';
import { WorkflowReport } from '../WorkflowReport.entity';
import { WorkflowReportService } from '../workflow-report.service';
import { AbstractExportService } from './abstract-export.service';
import * as XLSX from 'xlsx';
import * as xmljs from 'xml-js';

type ExportStrategyData = {
    format?: ExportFormat;
    disposition?: ExportDisposition;
    delimiter?: string;
    quote_char?: string;
    root_name?: string;
    item_name?: string;
    sheet_name?: string;
};

@Injectable()
export class JSONataExportService extends AbstractExportService {
    protected name = 'JSONata-Export';

    private exportDefinition?: ExportWorkflow;
    private config: Record<string, unknown> = {};
    private workflowReport?: WorkflowReport;

    constructor(
        private publicationIndexService: PublicationIndexService,
        private configService: AppConfigService,
        private workflowReportService: WorkflowReportService,
        private invoiceService: InvoiceService,
        private authorService: AuthorService,
        private instService: InstituteService,
        private geService: GreaterEntityService,
        private publService: PublisherService,
        private contractService: ContractService,
        private funderService: FunderService,
        private oaService: OACategoryService,
        private ptService: PublicationTypeService,
    ) {
        super();
    }

    public async setUp(exportDefinition: ExportWorkflow) {
        if (!exportDefinition?.mapping) {
            throw createInvalidRequestHttpException('Export workflow mapping is required.');
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
        /*(await this.configService.listEnvConfig()).forEach((entry) => {
            config[entry.key] = entry.value;
        });*/
        this.config = config;

        this.workflowReport = await this.workflowReportService.createReport({
            workflow_type: WorkflowType.EXPORT,
            workflow: this.exportDefinition,
            status: 'initialized',
            progress: 0,
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
            throw createInvalidRequestHttpException('JSONata export workflow is not configured.');
        }
        if (!hasProvidedEntityId(this.workflowReport?.id)) {
            throw createInvalidRequestHttpException('JSONata export workflow report is not configured.');
        }

        const startedAt = new Date();
        await this.updateRuntimeStatus(-1, `Started on ${startedAt}`, {
            by_user,
            started_at: startedAt,
            params: {
                ...this.workflowReport.params as Record<string, unknown>,
                filter: filter?.filter,
                filter_paths: filter?.paths,
                withMasterData: !!withMasterData,
            }
        });

        try {
            let publications = await this.publicationIndexService.getAll(filter?.filter, { serializeDates: true });
            if (filter) {
                const configuredFilterServices = (await this.configService.get('filter_services')) ?? [];
                for (const path of filter.paths) {
                    const serviceIndex = configuredFilterServices.findIndex((entry) => entry.path === path);
                    if (serviceIndex === -1 || !filterServices?.[serviceIndex]) continue;
                    publications = await filterServices[serviceIndex].filter(publications) as Publication[];
                }
            }

            await this.workflowReportService.write(this.workflowReport.id, {
                timestamp: new Date(),
                level: WorkflowReportItemLevel.INFO,
                message: `${publications.length} publications selected for export`
            });
            const items = await this.transformPublications(publications);
            const rendered = await this.render(items, !!withMasterData);

            await this.workflowReportService.write(this.workflowReport.id, {
                timestamp: new Date(),
                level: WorkflowReportItemLevel.INFO,
                message: `${items.length} export items rendered as ${this.resolveFormat()} with disposition ${this.resolveDisposition()}`
            });

            await this.workflowReportService.finish(this.workflowReport.id, {
                status: 'Successful export',
                summary: {
                    count_source: publications.length,
                    count_export: items.length,
                    format: this.resolveFormat(),
                    disposition: this.resolveDisposition(),
                }
            });
            this.status_text = 'Successfull export on ' + new Date();
            this.progress = 0;

            return rendered;
        } catch (error) {
            await this.workflowReportService.write(this.workflowReport.id, {
                timestamp: new Date(),
                level: WorkflowReportItemLevel.ERROR,
                message: `Error while exporting: ${this.formatExportError(error)}`
            });
            await this.workflowReportService.finish(this.workflowReport.id, {
                status: 'Error while exporting',
                summary: {
                    format: this.resolveFormat(),
                    disposition: this.resolveDisposition(),
                }
            });
            this.status_text = 'Error while exporting on ' + new Date();
            this.progress = 0;
            throw error;
        }
    }

    private formatExportError(error: unknown): string {
        if (error instanceof HttpException) {
            const response = this.asRecord(error.getResponse());
            const message = typeof response?.message === 'string' ? response.message : error.message;
            const details = Array.isArray(response?.details)
                ? response.details.map((detail) => this.formatErrorDetail(detail)).filter((detail): detail is string => !!detail)
                : [];
            return [message, ...details].filter(Boolean).join('\n');
        }

        const stack = this.getErrorStack(error);
        return stack ?? this.getErrorMessage(error);
    }

    private formatErrorDetail(detail: unknown): string | null {
        const record = this.asRecord(detail);
        if (!record || typeof record.message !== 'string') return null;

        const path = typeof record.path === 'string' ? record.path : '-';
        const code = typeof record.code === 'string' ? record.code : 'unknown';
        const context = this.formatErrorContext(record.context);
        return `${path}:${code} - ${record.message}${context ? ` (${context})` : ''}`;
    }

    private formatErrorContext(context: unknown): string {
        if (!context || typeof context !== 'object' || Array.isArray(context)) return '';
        return Object.entries(context)
            .map(([key, value]) => `${key}=${String(value)}`)
            .join(', ');
    }

    private asRecord(value: unknown): Record<string, unknown> | null {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
        return value as Record<string, unknown>;
    }

    private getErrorMessage(error: unknown): string {
        if (error instanceof Error) return error.message;
        const record = this.asRecord(error);
        if (typeof record?.message === 'string') return record.message;
        return String(error);
    }

    private getErrorStack(error: unknown): string | undefined {
        if (error instanceof Error) return error.stack;
        const record = this.asRecord(error);
        return typeof record?.stack === 'string' ? record.stack : undefined;
    }

    private resolveFormat(): ExportFormat {
        return this.getStrategy().format ?? 'json';
    }

    private resolveDisposition(): ExportDisposition {
        return this.getStrategy().disposition ?? (this.resolveFormat() === 'xlsx' ? 'attachment' : 'inline');
    }

    private getStrategy(): ExportStrategyData {
        return (this.exportDefinition?.strategy ?? {}) as ExportStrategyData;
    }

    private async transformPublications(
        publications: Publication[]
    ): Promise<unknown[]> {
        let expression: jsonata.Expression;
        try {
            expression = jsonata(this.exportDefinition!.mapping!);
        } catch (error) {
            throw this.createMappingHttpException(error);
        }
        const items: unknown[] = [];

        for (const publication of publications) {
            const context = this.buildItemContext(publication);
            let item: unknown;
            try {
                item = await expression.evaluate(context);
            } catch (error) {
                throw this.createMappingHttpException(error, publication);
            }
            this.appendTransformedItem(items, item);
        }

        return items;
    }

    private createMappingHttpException(error: unknown, publication?: Publication) {
        const message = this.getErrorMessage(error);
        const errorRecord = this.asRecord(error);
        return createInvalidRequestHttpException('Export mapping failed.', [
            {
                path: 'mapping',
                code: 'jsonata',
                message,
                context: {
                    ...(hasProvidedEntityId(publication?.id) ? { publicationId: publication.id } : {}),
                    ...(publication?.doi ? { doi: publication.doi } : {}),
                    ...(typeof errorRecord?.code === 'string' ? { jsonataCode: errorRecord.code } : {}),
                    ...(typeof errorRecord?.token === 'string' ? { token: errorRecord.token } : {}),
                    ...(typeof errorRecord?.position === 'number' ? { position: errorRecord.position } : {}),
                }
            }
        ]);
    }

    private appendTransformedItem(items: unknown[], item: unknown): void {
        if (item === undefined || item === null) return;
        if (Array.isArray(item) && item.every((entry) => this.isTabularRow(entry))) {
            items.push(...item);
            return;
        }
        items.push(item);
    }

    private isTabularRow(value: unknown): value is Record<string, unknown> {
        return !!value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
    }

    private buildItemContext(
        publication: Publication
    ): Publication & {
        params: { cfg: Record<string, unknown> }
    } {
        return {
            ...publication,
            params: {
                cfg: this.config,
            }
        };
    }

    private render(items: unknown[], withMasterData = false): Promise<string | Buffer> | string | Buffer {
        switch (this.resolveFormat()) {
            case 'xml':
                return this.renderXml(items);
            case 'csv':
                return this.renderCsv(items);
            case 'xlsx':
                return this.renderXlsx(items, withMasterData);
            case 'json':
            default:
                return this.renderJson(items);
        }
    }

    private renderJson(items: unknown[]): string {
        return JSON.stringify(items, null, 2);
    }

    private renderXml(items: unknown[]): string {
        const strategy = this.getStrategy();
        const rootName = strategy.root_name ?? 'export';
        const itemName = typeof strategy.item_name === 'string' && strategy.item_name.trim() ? strategy.item_name.trim() : 'item';

        return xmljs.js2xml({
            [rootName]: {
                [itemName]: items,
            }
        }, { compact: true, spaces: 2 });
    }

    private renderCsv(items: unknown[]): string {
        const strategy = this.getStrategy();
        const rows = this.toTabularRows(items);

        return Papa.unparse(rows, {
            delimiter: strategy.delimiter ?? ';',
            quoteChar: strategy.quote_char ?? '"',
            header: rows.length > 0 && typeof rows[0] === 'object' && !Array.isArray(rows[0]),
        });
    }

    private async renderXlsx(items: unknown[], withMasterData = false): Promise<Buffer> {
        const strategy = this.getStrategy();
        const sheetName = strategy.sheet_name ?? 'Export';
        const rows = this.toTabularRows(items);

        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        if (withMasterData) {
            await this.appendMasterDataSheets(workbook);
        }

        return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }

    private toTabularRows(items: unknown[]): Record<string, unknown>[] {
        return items.map((entry) => this.toRow(entry));
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

    private async appendMasterDataSheets(workbook: XLSX.WorkBook) {
        const authors = await this.authorService.get();
        this.appendSheet(workbook, "Personen", authors.map((author) => ({
            id: author.id,
            title: author.title,
            first_name: author.first_name,
            last_name: author.last_name,
            orcid: author.orcid,
            gnd_id: author.gnd_id,
            institutes: author.institutes?.map((entry) => entry.label).join(' | '),
        })));

        const institutes = await this.instService.get();
        this.appendSheet(workbook, "Institute", institutes.map((inst) => ({
            id: inst.id,
            label: inst.label,
            short_label: inst.short_label,
            super_institute: inst.super_institute?.short_label,
        })));

        const greaterEntities = await this.geService.get();
        this.appendSheet(workbook, "Größere Einheiten", greaterEntities.map((ge) => ({
            id: ge.id,
            label: ge.label,
            doaj_since: ge.doaj_since,
            doaj_until: ge.doaj_until,
            identifiers: ge.identifiers?.map((entry) => entry.value).join(' | '),
        })));

        const publishers = await this.publService.get();
        this.appendSheet(workbook, "Verlage", publishers.map((publisher) => ({
            id: publisher.id,
            label: publisher.label,
            doi_prefixes: publisher.doi_prefixes?.map((entry) => entry.doi_prefix).join(' | '),
        })));

        const contracts = await this.contractService.get();
        this.appendSheet(workbook, "Verträge", contracts.map((contract) => ({
            id: contract.id,
            label: contract.label,
            publisher: contract.publisher?.label,
            start_date: contract.start_date,
            end_date: contract.end_date,
            internal_number: contract.internal_number,
            invoice_amount: contract.invoice_amount,
            invoice_information: contract.invoice_information,
            gold_option: contract.gold_option,
            verification_method: contract.verification_method,
        })));

        const funders = await this.funderService.get();
        this.appendSheet(workbook, "Förderer", funders.map((funder) => ({
            id: funder.id,
            label: funder.label,
            doi: funder.doi,
            ror_id: funder.ror_id,
        })));

        const oaCategories = await this.oaService.get();
        this.appendSheet(workbook, "OA-Kategorien", oaCategories.map((oa) => ({
            id: oa.id,
            label: oa.label,
            is_oa: oa.is_oa,
        })));

        const publicationTypes = await this.ptService.get();
        this.appendSheet(workbook, "Publikationsarten", publicationTypes.map((pt) => ({
            id: pt.id,
            label: pt.label,
            review: pt.review,
        })));

        const costCenters = await this.invoiceService.getCostCenters();
        this.appendSheet(workbook, "Kostenstellen", costCenters.map((costCenter) => ({
            id: costCenter.id,
            label: costCenter.label,
            number: costCenter.number,
        })));

        const costTypes = await this.invoiceService.getCostTypes();
        this.appendSheet(workbook, "Kostenarten", costTypes.map((costType) => ({
            id: costType.id,
            label: costType.label,
        })));
    }

    private appendSheet(workbook: XLSX.WorkBook, name: string, rows: Record<string, unknown>[]) {
        const worksheet = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(workbook, worksheet, name);
    }

    private async updateRuntimeStatus(
        progress: number,
        status?: string,
        extra?: {
            by_user?: string;
            started_at?: Date;
            params?: unknown;
        }
    ) {
        this.progress = progress;
        if (status !== undefined) this.status_text = status;
        if (!hasProvidedEntityId(this.workflowReport?.id)) return;

        this.workflowReport = await this.workflowReportService.updateStatus(this.workflowReport.id, {
            progress,
            status,
            by_user: extra?.by_user,
            started_at: extra?.started_at,
            params: extra?.params,
        });
    }
}
