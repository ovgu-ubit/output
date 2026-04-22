import { HttpException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { ApiErrorCode } from '../../../../output-interfaces/ApiError';
import { ExportStrategy, WorkflowType } from '../../../../output-interfaces/Workflow';
import { JSONataExportService } from './jsonata-export.service';

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

        service = new JSONataExportService(
            publicationService as any,
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

    it('adds master data sheets only for xlsx exports when requested', async () => {
        await service.setUp({
            label: 'Excel Export',
            version: 4,
            strategy_type: ExportStrategy.HTTP_RESPONSE,
            strategy: { format: 'xlsx', disposition: 'attachment', sheet_name: 'Rows' },
            mapping: '{ "title": title, "doi": doi }'
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
