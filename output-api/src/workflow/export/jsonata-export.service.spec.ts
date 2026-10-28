import { HttpException } from '@nestjs/common';
import * as fs from 'fs';
import jsonata from 'jsonata';
import * as path from 'path';
import * as XLSX from 'xlsx';
import * as Papa from 'papaparse';
import * as xmljs from 'xml-js';
import {  ApiErrorCode  } from '@output/interfaces';
import {  ExportStrategy, WorkflowReportItemLevel, WorkflowType  } from '@output/interfaces';
import { JSONataExportService } from './jsonata-export.service';
import { ExportSourceService } from './export-source.service';

const expectApiError = async (
    promise: Promise<unknown>,
    expected: {
        statusCode: number;
        code: ApiErrorCode;
        message?: string;
    },
) => {
    try {
        await promise;
        fail(`Expected promise to reject with ${expected.code}`);
    } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getResponse()).toMatchObject({
            statusCode: expected.statusCode,
            code: expected.code,
            ...(expected.message ? { message: expected.message } : {}),
        });
    }
};

describe('JSONataExportService', () => {
    let service: JSONataExportService;
    let publicationService: { getAll: jest.Mock };
    let workflowReportService: { createReport: jest.Mock, updateStatus: jest.Mock, write: jest.Mock, finish: jest.Mock };
    let configService: { listDatabaseConfig: jest.Mock, listEnvConfig: jest.Mock, get: jest.Mock };
    let invoiceService: { getCostCenters: jest.Mock, getCostTypes: jest.Mock };
    let authorService: { get: jest.Mock };
    let instService: { get: jest.Mock };
    let geService: { get: jest.Mock };
    let publService: { get: jest.Mock };
    let contractService: { get: jest.Mock };
    let funderService: { get: jest.Mock };
    let oaService: { get: jest.Mock };
    let ptService: { get: jest.Mock };

    beforeEach(() => {
        publicationService = {
            getAll: jest.fn(async (_filter, options) => {
                expect(options).toEqual({ serializeDates: true });
                return [
                    {
                        id: 1,
                        title: 'First',
                        doi: '10.1/test',
                        pub_date: '2024-01-02T03:04:05.000Z',
                        invoices: [{ date: '2024-02-03T04:05:06.000Z' }],
                    },
                    {
                        id: 2,
                        title: 'Second',
                        doi: '10.2/test',
                        pub_date: '2024-05-06T07:08:09.000Z',
                        invoices: [{ date: '2024-06-07T08:09:10.000Z' }],
                    },
                ];
            }),
        };
        workflowReportService = {
            createReport: jest.fn(async (report) => ({ id: 41, ...report })),
            updateStatus: jest.fn(async (_id, report) => ({ id: 41, ...report })),
            write: jest.fn(async () => undefined),
            finish: jest.fn(async () => undefined),
        };
        configService = {
            listDatabaseConfig: jest.fn(async () => [{ key: 'institution', value: 'Test University' }]),
            listEnvConfig: jest.fn(async () => []),
            get: jest.fn(async () => []),
        };
        invoiceService = {
            getCostCenters: jest.fn(async () => [{ id: 301, label: 'CC-1', number: '100' }]),
            getCostTypes: jest.fn(async () => [{ id: 401, label: 'APC' }]),
        };
        authorService = {
            get: jest.fn(async () => [{ id: 101, first_name: 'Ada', last_name: 'Lovelace', institutes: [{ label: 'Math' }] }]),
        };
        instService = {
            get: jest.fn(async () => [{ id: 201, label: 'Math', short_label: 'MTH', super_institute: null }]),
        };
        geService = {
            get: jest.fn(async () => [{ id: 202, label: 'Journal', identifiers: [{ value: '1234-5678' }] }]),
        };
        publService = {
            get: jest.fn(async () => [{ id: 203, label: 'Publisher', doi_prefixes: [{ doi_prefix: '10.1' }] }]),
        };
        contractService = {
            get: jest.fn(async () => [{ id: 204, label: 'Contract', publisher: { label: 'Publisher' } }]),
        };
        funderService = {
            get: jest.fn(async () => [{ id: 205, label: 'Funder', doi: '10.2/funder', ror_id: 'ror-1' }]),
        };
        oaService = {
            get: jest.fn(async () => [{ id: 206, label: 'gold', is_oa: true }]),
        };
        ptService = {
            get: jest.fn(async () => [{ id: 207, label: 'article', review: true }]),
        };

        const sources = new ExportSourceService(
            publicationService as any,
            { getForExport: authorService.get } as any,
            instService as any,
            geService as any,
            { getForExport: publService.get } as any,
            { getForExport: contractService.get } as any,
            { getForExport: funderService.get } as any,
            oaService as any,
            { getForExport: ptService.get } as any,
            invoiceService as any,
        );
        service = new JSONataExportService(
            sources,
            configService as any,
            workflowReportService as any,
            invoiceService as any,
            authorService as any,
            instService as any,
            geService as any,
            publService as any,
            contractService as any,
            funderService as any,
            oaService as any,
            ptService as any,
        );
    });

    it('requires setup before export', async () => {
        await expectApiError(service.export(), {
            statusCode: 400,
            code: ApiErrorCode.INVALID_REQUEST,
            message: 'JSONata export workflow is not configured.',
        });
    });

    it.each(['json', 'csv', 'xml', 'xlsx'] as const)('exports mapped persons as %s', async (format) => {
        authorService.get.mockResolvedValue([{
            id: 101, first_name: 'Ada', last_name: 'Lovelace', internal_remark: 'Internal; note',
            institutes: [{ label: 'Math' }], aliases_first_name: [{ alias: 'Augusta Ada' }],
        }]);
        await service.setUp({
            source_entity: 'author', strategy_type: ExportStrategy.HTTP_RESPONSE,
            strategy: { format, disposition: 'attachment', delimiter: ';', quote_char: '"', root_name: 'records', item_name: 'record', sheet_name: 'People' },
            mapping: '{ "name": first_name & " " & last_name, "remark": internal_remark, "institute": institutes[0].label, "alias": aliases_first_name[0].alias, "institution": params.cfg.institution }',
        });

        const result = await service.export();
        const row = { name: 'Ada Lovelace', remark: 'Internal; note', institute: 'Math', alias: 'Augusta Ada', institution: 'Test University' };
        if (format === 'json') expect(JSON.parse(result as string)).toEqual([row]);
        if (format === 'csv') expect(Papa.parse(result as string, { header: true, delimiter: ';' }).data).toEqual([row]);
        if (format === 'xml') expect(xmljs.xml2js(result as string, { compact: true })).toMatchObject({ records: { record: { name: { _text: row.name }, remark: { _text: row.remark } } } });
        if (format === 'xlsx') {
            const workbook = XLSX.read(result, { type: 'buffer' });
            expect(XLSX.utils.sheet_to_json(workbook.Sheets.People)).toEqual([row]);
        }
        expect(publicationService.getAll).not.toHaveBeenCalled();
        expect(authorService.get).toHaveBeenCalledWith({ rights: { read: true } });
        expect(workflowReportService.finish).toHaveBeenCalledWith(41, expect.objectContaining({
            summary: expect.objectContaining({ source_entity: 'author', count_source: 1, count_export: 1 }),
        }));
    });

    it('exports contract component invoice costs as separate rows', async () => {
        contractService.get.mockResolvedValue([{
            id: 204, label: 'Agreement', publisher: { label: 'Publisher' },
            identifiers: [{ value: 'agreement-id' }],
            components: [{ linked_invoices: [{ cost_center: { label: 'Library' }, cost_items: [
                { euro_value: 100, cost_type: { label: 'APC' } },
                { euro_value: 20, cost_type: { label: 'Pages' } },
            ] }] }],
        }]);
        await service.setUp({
            source_entity: 'contract', strategy: { format: 'json' },
            mapping: '($publisher := publisher.label; $identifier := identifiers[0].value; components.linked_invoices.($center := cost_center.label; cost_items.{ "publisher": $publisher, "identifier": $identifier, "center": $center, "type": cost_type.label, "amount": euro_value }))',
        });

        expect(JSON.parse(await service.export() as string)).toEqual([
            { publisher: 'Publisher', identifier: 'agreement-id', center: 'Library', type: 'APC', amount: 100 },
            { publisher: 'Publisher', identifier: 'agreement-id', center: 'Library', type: 'Pages', amount: 20 },
        ]);
    });

    it('filters persons in JSONata and expands retained rows', async () => {
        authorService.get.mockResolvedValue([{ id: 101 }, { id: 102 }]);
        await service.setUp({ source_entity: 'author', mapping: 'id = 101 ? [{ "id": id, "row": 1 }, { "id": id, "row": 2 }] : null' });

        expect(JSON.parse(await service.export() as string)).toEqual([{ id: 101, row: 1 }, { id: 101, row: 2 }]);
        expect(workflowReportService.finish).toHaveBeenCalledWith(41, expect.objectContaining({
            summary: expect.objectContaining({ count_source: 2, count_export: 2 }),
        }));
    });

    it.each(['null', 'missing_field', '[]'])('skips empty mapping results: %s', async (mapping) => {
        await service.setUp({ source_entity: 'author', mapping });
        expect(await service.export()).toBe('[]');
    });

    it('exports an empty source', async () => {
        authorService.get.mockResolvedValue([]);
        await service.setUp({ source_entity: 'author', mapping: '$' });
        expect(await service.export()).toBe('[]');
    });

    it.each([
        { filter: { expressions: [] }, paths: ['missing-invoice-data'] },
        { filter: { expressions: [{}] }, paths: [] },
    ])('rejects publication filters on other sources', async (filter) => {
        await service.setUp({ source_entity: 'author', mapping: '$' });
        await expectApiError(service.export(filter as any), {
            statusCode: 400, code: ApiErrorCode.INVALID_REQUEST,
            message: 'Publication filters are only supported for publication exports.',
        });
        expect(authorService.get).not.toHaveBeenCalled();
        expect(publicationService.getAll).not.toHaveBeenCalled();
        expect(workflowReportService.finish).toHaveBeenCalledWith(41, expect.objectContaining({ status: 'Error while exporting' }));
    });

    it('accepts an empty publication filter for another source', async () => {
        await service.setUp({ source_entity: 'author', mapping: '{ "name": first_name }' });
        expect(JSON.parse(await service.export({ filter: { expressions: [] }, paths: [] }) as string)).toEqual([{ name: 'Ada' }]);
        expect(configService.get).not.toHaveBeenCalled();
    });

    it('reports the source and record ID on mapping errors for persons', async () => {
        await service.setUp({ source_entity: 'author', mapping: '$number(first_name)' });
        await expectApiError(service.export(), { statusCode: 400, code: ApiErrorCode.INVALID_REQUEST });
        expect(workflowReportService.write).toHaveBeenCalledWith(41, expect.objectContaining({
            level: WorkflowReportItemLevel.ERROR,
            message: expect.stringContaining('source_entity=author, entityId=101'),
        }));
    });

    it('rejects unsupported source classes at setup', async () => {
        await expectApiError(service.setUp({ source_entity: 'invoice' as any, mapping: '$' }), {
            statusCode: 400, code: ApiErrorCode.INVALID_REQUEST,
        });
    });

    it('renders mapped JSON output', async () => {
        await service.setUp({
            label: 'JSON Export',
            version: 1,
            strategy_type: ExportStrategy.HTTP_RESPONSE,
            strategy: { format: 'json', disposition: 'inline' },
            mapping: '{ "title": title, "doi": doi, "institution": params.cfg.institution, "pub_date": pub_date, "invoice_date": invoices[0].date }'
        });

        const result = await service.export(undefined, undefined, 'tester');

        expect(result).toBe(JSON.stringify([
            {
                title: 'First',
                doi: '10.1/test',
                institution: 'Test University',
                pub_date: '2024-01-02T03:04:05.000Z',
                invoice_date: '2024-02-03T04:05:06.000Z',
            },
            {
                title: 'Second',
                doi: '10.2/test',
                institution: 'Test University',
                pub_date: '2024-05-06T07:08:09.000Z',
                invoice_date: '2024-06-07T08:09:10.000Z',
            },
        ], null, 2));
        expect(workflowReportService.createReport).toHaveBeenCalledWith(expect.objectContaining({
            workflow_type: WorkflowType.EXPORT,
            progress: 0,
        }));
        expect(workflowReportService.updateStatus).toHaveBeenCalledWith(41, expect.objectContaining({
            by_user: 'tester',
            progress: -1,
            status: expect.stringContaining('Started on '),
        }));
        expect(workflowReportService.write).toHaveBeenCalledTimes(2);
        expect(workflowReportService.finish).toHaveBeenCalledWith(41, expect.objectContaining({
            status: 'Successful export',
            summary: expect.objectContaining({
                count_source: 2,
                count_export: 2,
            })
        }));
    });

    it('retains publication field filters and filter services', async () => {
        const fieldFilter = { expressions: [] };
        const filterService = { filter: jest.fn(async (publications) => publications.slice(1)) };
        configService.get.mockResolvedValue([{ path: 'selected' }]);
        await service.setUp({ mapping: '{ "title": title }' });

        const result = await service.export({ filter: fieldFilter, paths: ['selected'] }, [filterService as any]);

        expect(publicationService.getAll).toHaveBeenCalledWith(fieldFilter, { serializeDates: true });
        expect(filterService.filter).toHaveBeenCalledTimes(1);
        expect(JSON.parse(result as string)).toEqual([{ title: 'Second' }]);
    });

    it('renders mapped CSV output', async () => {
        await service.setUp({
            label: 'CSV Export',
            version: 2,
            strategy_type: ExportStrategy.HTTP_RESPONSE,
            strategy: { format: 'csv', disposition: 'inline', delimiter: ',', quote_char: '"' },
            mapping: '{ "title": title, "doi": doi }'
        });

        const result = await service.export();

        expect(result).toBe('title,doi\r\nFirst,10.1/test\r\nSecond,10.2/test');
    });

    it('expands array mapping results into separate export rows', async () => {
        await service.setUp({
            label: 'JSON Export',
            version: 2,
            strategy_type: ExportStrategy.HTTP_RESPONSE,
            strategy: { format: 'json', disposition: 'inline' },
            mapping: '[{ "title": title, "row": 1 }, { "title": title, "row": 2 }]'
        });

        const result = await service.export();

        expect(result).toBe(JSON.stringify([
            { title: 'First', row: 1 },
            { title: 'First', row: 2 },
            { title: 'Second', row: 1 },
            { title: 'Second', row: 2 },
        ], null, 2));
        expect(workflowReportService.finish).toHaveBeenCalledWith(41, expect.objectContaining({
            summary: expect.objectContaining({
                count_source: 2,
                count_export: 4,
            })
        }));
    });

    it('returns an invalid request when the mapping fails at runtime', async () => {
        await service.setUp({
            label: 'JSON Export',
            version: 2,
            strategy_type: ExportStrategy.HTTP_RESPONSE,
            strategy: { format: 'json', disposition: 'inline' },
            mapping: '{ "year": $number(title) }'
        });

        await expectApiError(service.export(), {
            statusCode: 400,
            code: ApiErrorCode.INVALID_REQUEST,
            message: 'Export mapping failed.',
        });
        expect(workflowReportService.finish).toHaveBeenCalledWith(41, expect.objectContaining({
            status: 'Error while exporting',
        }));
        expect(workflowReportService.write).toHaveBeenCalledWith(41, expect.objectContaining({
            level: WorkflowReportItemLevel.ERROR,
            message: expect.stringContaining('mapping:jsonata - Unable to cast value to a number'),
        }));
        expect(workflowReportService.write).toHaveBeenCalledWith(41, expect.objectContaining({
            level: WorkflowReportItemLevel.ERROR,
            message: expect.stringContaining('doi=10.1/test'),
        }));
    });

    it('keeps the Juelich export template tolerant of nullable VAT values', async () => {
        const templatePath = path.resolve(__dirname, '../../../templates/export/Juelich Export.json');
        const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));
        const expression = jsonata(template.mapping);

        const result = await expression.evaluate({
            id: 2,
            doi: '10.22266/ijies2025.1231.21',
            invoices: [
                {
                    date: '2025-01-01T00:00:00.000Z',
                    cost_items: [
                        {
                            label: 'APC',
                            euro_value: 100,
                            vat: null,
                            cost_type: { label: 'Article Processing Charges' },
                        },
                    ],
                },
            ],
        });
        const row = Array.isArray(result) ? result[0] : result;

        expect(row).toMatchObject({
            DOI: '10.22266/ijies2025.1231.21',
            'Euro netto': 100,
            Steuersatz: 0,
            'Euro brutto': 100,
        });
    });

    it('creates one Juelich CostItem export row per invoice cost item', async () => {
        const templatePath = path.resolve(__dirname, '../../../templates/export/JuelichExport CostItem.json');
        const template = JSON.parse(fs.readFileSync(templatePath, 'utf-8'));
        const expression = jsonata(template.mapping);

        const result = await expression.evaluate({
            doi: '10.1/cost-items',
            invoices: [
                {
                    date: '2024-01-15T00:00:00.000Z',
                    cost_items: [
                        {
                            label: 'APC',
                            euro_value: 100,
                            vat: 19,
                            cost_type: { label: 'Article Processing Charges' },
                        },
                        {
                            label: 'Page Charges',
                            euro_value: 50,
                            vat: 0,
                            cost_type: { label: 'Page Charges' },
                        },
                    ],
                },
                {
                    date: '2025-02-20T00:00:00.000Z',
                    cost_items: [
                        {
                            label: 'Color Charges',
                            euro_value: 25,
                            vat: null,
                            cost_type: { label: 'Color Charges' },
                        },
                    ],
                },
            ],
        });

        expect(result).toHaveLength(3);
        expect(result).toEqual(expect.arrayContaining([
            expect.objectContaining({
                DOI: '10.1/cost-items',
                Bemerkung: 'APC',
                'Euro netto': 100,
                Steuersatz: 0.19,
                'Euro brutto': 119,
                'Rechnungsjahr / Lizenzjahr': 2024,
            }),
            expect.objectContaining({
                Bemerkung: 'Page Charges',
                'Euro netto': 50,
                'Euro brutto': 50,
                'Rechnungsjahr / Lizenzjahr': 2024,
            }),
            expect.objectContaining({
                Bemerkung: 'Color Charges',
                'Euro netto': 25,
                'Euro brutto': 25,
                'Rechnungsjahr / Lizenzjahr': 2025,
            }),
        ]));
    });

    it('renders an xlsx buffer for excel downloads', async () => {
        await service.setUp({
            label: 'Excel Export',
            version: 3,
            strategy_type: ExportStrategy.HTTP_RESPONSE,
            strategy: { format: 'xlsx', disposition: 'attachment', sheet_name: 'Rows' },
            mapping: '{ "title": title, "doi": doi }'
        });

        const result = await service.export();

        expect(service.isExcelResponse()).toBe(true);
        expect(Buffer.isBuffer(result)).toBe(true);
        const workbook = XLSX.read(result as Buffer, { type: 'buffer' });
        expect(workbook.SheetNames).toEqual(['Rows']);
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets.Rows);
        expect(rows).toEqual([
            { title: 'First', doi: '10.1/test' },
            { title: 'Second', doi: '10.2/test' },
        ]);
    });

    it.each(['publication', 'author'] as const)('adds master data sheets for xlsx source %s when requested', async (source_entity) => {
        await service.setUp({
            source_entity,
            label: 'Excel Export',
            version: 4,
            strategy_type: ExportStrategy.HTTP_RESPONSE,
            strategy: { format: 'xlsx', disposition: 'attachment', sheet_name: 'Rows' },
            mapping: source_entity === 'publication' ? '{ "title": title, "doi": doi }' : '{ "first_name": first_name }'
        });

        const result = await service.export(undefined, undefined, 'tester', true);

        const workbook = XLSX.read(result as Buffer, { type: 'buffer' });
        expect(workbook.SheetNames).toEqual([
            'Rows',
            'Personen',
            'Institute',
            'Größere Einheiten',
            'Verlage',
            'Verträge',
            'Förderer',
            'OA-Kategorien',
            'Publikationsarten',
            'Kostenstellen',
            'Kostenarten',
        ]);
        expect(XLSX.utils.sheet_to_json(workbook.Sheets.Personen)).toEqual([
            expect.objectContaining({ first_name: 'Ada', last_name: 'Lovelace' }),
        ]);
        expect(invoiceService.getCostCenters).toHaveBeenCalled();
        expect(invoiceService.getCostTypes).toHaveBeenCalled();
    });
});
