import { BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { ExportStrategy } from '../../../../output-interfaces/Workflow';
import { JSONataExportService } from './jsonata-export.service';

describe('JSONataExportService', () => {
    let service: JSONataExportService;
    let publicationService: { getAll: jest.Mock };
    let reportService: { createReport: jest.Mock, finish: jest.Mock };
    let configService: { listDatabaseConfig: jest.Mock, listEnvConfig: jest.Mock, get: jest.Mock };

    beforeEach(() => {
        publicationService = {
            getAll: jest.fn(async () => [
                { id: 1, title: 'First', doi: '10.1/test' },
                { id: 2, title: 'Second', doi: '10.2/test' },
            ]),
        };
        reportService = {
            createReport: jest.fn(async () => 'report.log'),
            finish: jest.fn(),
        };
        configService = {
            listDatabaseConfig: jest.fn(async () => [{ key: 'institution', value: 'Test University' }]),
            listEnvConfig: jest.fn(async () => []),
            get: jest.fn(async () => []),
        };

        service = new JSONataExportService(
            publicationService as any,
            reportService as any,
            configService as any,
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
            mapping: '{ "institution": params.cfg.institution, "items": publications.{ "title": title, "doi": doi } }'
        });

        const result = await service.export(undefined, undefined, 'tester');

        expect(result).toBe(JSON.stringify({
            institution: 'Test University',
            items: [
                { title: 'First', doi: '10.1/test' },
                { title: 'Second', doi: '10.2/test' },
            ]
        }, null, 2));
        expect(reportService.createReport).toHaveBeenCalledWith('Export', 'JSON Export_v1', 'tester');
        expect(reportService.finish).toHaveBeenCalled();
    });

    it('renders mapped CSV output', async () => {
        await service.setUp({
            label: 'CSV Export',
            version: 2,
            strategy_type: ExportStrategy.HTTP_RESPONSE,
            strategy: { format: 'csv', disposition: 'inline', delimiter: ',', quote_char: '"' },
            mapping: 'publications.{ "title": title, "doi": doi }'
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
            mapping: 'publications.{ "title": title, "doi": doi }'
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
