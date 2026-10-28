import * as XLSX from 'xlsx';
import { EntityAccessRight } from '../../common/abstract-entity.service';
import { ExcelExportService } from './excel-export.service';

describe('ExcelExportService', () => {
    let service: ExcelExportService;
    let authorService: { get: jest.Mock };

    beforeEach(() => {
        authorService = { get: jest.fn().mockResolvedValue([]) };
        const masterDataService = { get: jest.fn().mockResolvedValue([]) };
        service = new ExcelExportService(
            { getAll: jest.fn().mockResolvedValue([]) } as any,
            { createReport: jest.fn().mockResolvedValue('report'), finish: jest.fn() } as any,
            { get: jest.fn().mockResolvedValue([]) } as any,
            {
                getCostTypes: jest.fn().mockResolvedValue([]),
                getCostCenters: jest.fn().mockResolvedValue([]),
            } as any,
            authorService as any,
            masterDataService as any,
            masterDataService as any,
            masterDataService as any,
            masterDataService as any,
            masterDataService as any,
            masterDataService as any,
            masterDataService as any,
        );
    });

    it.each(['A remark with "quotes"; and a\nsecond line', '', undefined, null])(
        'includes the internal_remark column in the Personen sheet for remark %p',
        async (remark) => {
            authorService.get.mockResolvedValue([{
                id: 101,
                first_name: 'Ada',
                last_name: 'Lovelace',
                institutes: [{ label: 'Math' }],
                internal_remark: remark,
            }]);

            const result = await service.export(undefined, undefined, 'tester', true);
            const workbook = XLSX.read(result, { type: 'buffer' });

            expect(XLSX.utils.sheet_to_json(workbook.Sheets.Personen, { defval: '' })).toEqual([
                expect.objectContaining({
                    id: 101,
                    first_name: 'Ada',
                    last_name: 'Lovelace',
                    institutes: 'Math',
                    internal_remark: remark ?? '',
                }),
            ]);
            expect(authorService.get).toHaveBeenCalledWith({ rights: { [EntityAccessRight.Read]: true } });
        },
    );

    it('exports only publications when master data is not requested', async () => {
        const result = await service.export();
        const workbook = XLSX.read(result, { type: 'buffer' });

        expect(workbook.SheetNames).toEqual(['Publikationen']);
        expect(authorService.get).not.toHaveBeenCalled();
    });
});
