import { of, Subject, throwError } from 'rxjs';
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

    it('uses an entity page endpoint instead of loading the entire index', () => {
        const index = vi.fn();
        const indexPage = vi.fn().mockReturnValue(of({ items: [{ id: 5 }], total: 51, page: 1, page_size: 10 }));
        service.init({ index, indexPage } as any, { buttons: [] }, [{ colName: 'label', colTitle: 'Name' }]);
        service.setReportingYear(2026);
        service.setPage(1, 10);
        service.searchControl.setValue('Test');
        service.announceSortChange({ active: 'label', direction: 'asc' });
        service.announceSortChange({ active: 'edit', direction: 'asc' });
        service.updateData().subscribe();

        expect(index).not.toHaveBeenCalled();
        expect(indexPage).toHaveBeenCalledWith({
            reporting_year: 2026, page: 1, page_size: 10, q: 'Test',
            sort: [{ key: 'label', direction: 'asc' }], column_filters: {},
        });
        expect(service.total).toBe(51);
        expect(service.dataSource.data).toEqual([{ id: 5 }]);
    });

    it('cancels stale searches so they cannot replace the latest results', () => {
        const stale = new Subject<any>();
        const current = new Subject<any>();
        const indexPage = vi.fn().mockReturnValueOnce(stale).mockReturnValueOnce(current);
        service.init({ indexPage } as any, { buttons: [] }, []);
        service.updateData().subscribe();
        service.searchControl.setValue('new');
        service.updateData().subscribe();
        expect(stale.observed).toBe(false);
        expect(service.loading).toBe(true);
        current.next({ items: [{ id: 2 }], total: 1, page: 0, page_size: 10 });
        current.complete();
        stale.next({ items: [{ id: 1 }], total: 1, page: 0, page_size: 10 });
        expect(service.dataSource.data).toEqual([{ id: 2 }]);
        expect(service.loading).toBe(false);
    });

    it('reloads the last valid page after its final row was deleted', () => {
        const indexPage = vi.fn()
            .mockReturnValueOnce(of({ items: [], total: 10, page: 1, page_size: 10 }))
            .mockReturnValueOnce(of({ items: [{ id: 1 }], total: 10, page: 0, page_size: 10 }));
        service.init({ indexPage } as any, { buttons: [] }, []);
        service.setPage(1, 10);
        service.updateData().subscribe();
        expect(indexPage).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0 }));
        expect(service.page).toBe(0);
        expect(service.dataSource.data).toEqual([{ id: 1 }]);
    });

    it('ends the loading state after errors and permits a subsequent request', () => {
        const indexPage = vi.fn().mockReturnValueOnce(throwError(() => new Error('offline')))
            .mockReturnValueOnce(of({ items: [], total: 0, page: 0, page_size: 10 }));
        service.init({ indexPage } as any, { buttons: [] }, []);
        service.updateData().subscribe({ error: () => undefined });
        expect(service.loading).toBe(false);
        service.updateData().subscribe();
        expect(indexPage).toHaveBeenCalledTimes(2);
    });
});
