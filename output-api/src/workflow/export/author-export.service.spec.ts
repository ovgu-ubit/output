import * as Papa from 'papaparse';
import { EntityAccessRight } from '../../common/abstract-entity.service';
import { AuthorExportService } from './author-export.service';

describe('AuthorExportService', () => {
    let service: AuthorExportService;
    let authorService: { get: jest.Mock };

    beforeEach(() => {
        authorService = { get: jest.fn().mockResolvedValue([]) };
        service = new AuthorExportService(
            authorService as any,
            { createReport: jest.fn().mockResolvedValue('report'), finish: jest.fn() } as any,
        );
    });

    it.each(['A remark; with a\nsecond line', '', undefined, null])(
        'includes internal_remark in the author CSV for remark %p',
        async (remark) => {
            authorService.get.mockResolvedValue([{
                id: 101,
                first_name: 'Ada',
                last_name: 'Lovelace',
                institutes: [{ label: 'Math' }, { label: 'Computing' }],
                internal_remark: remark,
            }]);

            const result = await service.export(undefined, undefined, 'tester');
            const parsed = Papa.parse(result, { delimiter: ';', header: true, skipEmptyLines: true });

            expect(parsed.errors).toEqual([]);
            expect(parsed.data).toEqual([{
                id: '101',
                title: '',
                first_name: 'Ada',
                last_name: 'Lovelace',
                orcid: '',
                gnd_id: '',
                institutes: 'Math | Computing',
                internal_remark: remark ?? '',
            }]);
            expect(authorService.get).toHaveBeenCalledWith({ rights: { [EntityAccessRight.Read]: true } });
        },
    );

    it('includes the remark header even when there are no authors', async () => {
        const result = await service.export();
        const parsed = Papa.parse(result, { delimiter: ';', header: true, skipEmptyLines: true });

        expect(parsed.meta.fields).toContain('internal_remark');
        expect(parsed.data).toEqual([]);
        expect(parsed.errors).toEqual([]);
    });
});
