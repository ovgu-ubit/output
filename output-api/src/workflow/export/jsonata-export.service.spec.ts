import { BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { ExportStrategy, WorkflowType } from '../../../../output-interfaces/Workflow';
import { JSONataExportService } from './jsonata-export.service';

describe('JSONataExportService', () => {
    let service: JSONataExportService;
    let publicationService: { getAll: jest.Mock };
    let workflowReportService: { createReport: jest.Mock, save: jest.Mock, write: jest.Mock, finish: jest.Mock };
    let configService: { listDatabaseConfig: jest.Mock, listEnvConfig: jest.Mock, get: jest.Mock };

    beforeEach(() => {
        publicationService = {
            getAll: jest.fn(async () => [
                {
                    id: 1,
                    title: 'First',
                    doi: '10.1/test',
                    pub_date: new Date('2024-01-02T03:04:05.000Z'),
                    invoices: [{ date: new Date('2024-02-03T04:05:06.000Z') }],
                },
                {
                    id: 2,
                    title: 'Second',
                    doi: '10.2/test',
                    pub_date: new Date('2024-05-06T07:08:09.000Z'),
                    invoices: [{ date: new Date('2024-06-07T08:09:10.000Z') }],
                },
            ]),
        };
        workflowReportService = {
            createReport: jest.fn(async (report) => ({ id: 41, ...report })),
            save: jest.fn(async (report) => report),
            write: jest.fn(async () => undefined),
            finish: jest.fn(async () => undefined),
        };
        configService = {
            listDatabaseConfig: jest.fn(async () => [{ key: 'institution', value: 'Test University' }]),
            listEnvConfig: jest.fn(async () => []),
            get: jest.fn(async () => []),
        };

        service = new JSONataExportService(
            publicationService as any,
            configService as any,
            workflowReportService as any,
        );
    });

    it('requires setup before export', async () => {
        await expect(service.export()).rejects.toBeInstanceOf(BadRequestException);
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
        }));
        expect(workflowReportService.save).toHaveBeenCalledWith(expect.objectContaining({
            id: 41,
            by_user: 'tester',
            status: 'started',
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
});
