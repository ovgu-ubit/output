import { of } from 'rxjs';
import { TableDataService } from './table-data.service';

describe('TableDataService', () => {
    let service: TableDataService<any, any>;

    beforeEach(() => {
        service = new TableDataService<any, any>();
        service.init({ index: vi.fn().mockName('index').mockReturnValue(of([])) } as any, { buttons: [] } as any, [{ colName: 'id', colTitle: 'ID', type: 'number' }]);
    });

    it('uses changed headers when sorting data', () => {
        service.update([
            { id: 1, status: 10 },
            { id: 2, status: 2 },
        ]);

        service.setHeaders([
            { colName: 'id', colTitle: 'ID', type: 'number' },
            { colName: 'status', colTitle: 'Status', type: 'number' },
        ]);
        service.announceSortChange({ active: 'status', direction: 'asc' });

        expect(service.dataSource.data.map(row => row.status)).toEqual([2, 10]);
    });

    it('loads server-side pages with search, filters and stable table state', () => {
        const loadPage = vi.fn().mockName('loadPage').mockReturnValue(of({
            items: [{ id: 21, title: 'Angular' }],
            total: 41,
            page: 2,
            page_size: 20,
        }));
        service = new TableDataService<any, any>();
        service.init(
            { index: vi.fn() } as any,
            { buttons: [], loadPage } as any,
            [{ colName: 'title', colTitle: 'Titel' }],
        );
        service.setReportingYear(2025);
        service.setPage(2, 20);
        service.columnFilter = true;
        service.filterValues.set('title', 'Angular*');
        service.announceSortChange({ active: 'edit', direction: 'desc' });

        service.updateData().subscribe(rows => expect(rows).toEqual([{ id: 21, title: 'Angular' }]));

        expect(loadPage).toHaveBeenCalledWith({
            page: 2,
            page_size: 20,
            sort: [{ key: 'locked', direction: 'desc' }],
            q: undefined,
            column_filters: { title: 'Angular*' },
        }, 2025);
        expect(service.total).toBe(41);
        expect(service.dataSource.data).toEqual([{ id: 21, title: 'Angular' }]);
        expect(service.dataSource.paginator).toBeFalsy();
    });
});
