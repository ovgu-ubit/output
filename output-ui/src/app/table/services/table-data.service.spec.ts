import { of, Subject, throwError } from 'rxjs';
import { TableDataService } from './table-data.service';

describe('TableDataService', () => {
    let service: TableDataService<any, any>;

    beforeEach(() => {
        service = new TableDataService<any, any>();
        service.init({ indexPage: vi.fn().mockReturnValue(of({ items: [], total: 0, page: 0, page_size: 10 })) } as any, { buttons: [] } as any, [{ colName: 'id', colTitle: 'ID', type: 'number' }]);
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
            { indexPage: vi.fn() } as any,
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
        expect(service.dataSource).toEqual([{ id: 21, title: 'Angular' }]);
    });

    it('forwards paging, search and multi-sort to the page endpoint', () => {
        const indexPage = vi.fn().mockReturnValue(of({ items: [{ id: 5 }], total: 51, page: 1, page_size: 10 }));
        service.init({ indexPage } as any, { buttons: [] }, [{ colName: 'label', colTitle: 'Name' }]);
        service.setReportingYear(2026);
        service.setPage(1, 10);
        service.searchControl.setValue('Test');
        service.announceSortChange({ active: 'label', direction: 'asc' });
        service.announceSortChange({ active: 'edit', direction: 'asc' });
        service.updateData().subscribe();

        expect(indexPage).toHaveBeenCalledWith({
            reporting_year: 2026, page: 1, page_size: 10, q: 'Test',
            search_columns: ['label'],
            sort: [{ key: 'label', direction: 'asc' }], column_filters: {},
        }, undefined);
        expect(service.total).toBe(51);
        expect(service.dataSource).toEqual([{ id: 5 }]);
    });

    it('uses the same columns for global and column search and ignores stale metric filters', () => {
        const indexPage = vi.fn().mockReturnValue(of({ items: [], total: 0, page: 0, page_size: 10 }));
        service.init({ indexPage } as any, { buttons: [] }, [
            { colName: 'id', colTitle: 'ID', type: 'number' },
            { colName: 'label', colTitle: 'Name' },
            { colName: 'pub_count', colTitle: 'Publikationen', type: 'pubs' },
            { colName: 'author_count', colTitle: 'Personen', type: 'number', filterable: false },
            { colName: 'net_costs', colTitle: 'Kosten', type: 'euro' },
            { colName: 'date', colTitle: 'Datum', type: 'date' },
        ]);
        service.searchControl.setValue('123');
        service.columnFilter = true;
        service.filterValues = new Map([['label', 'Name'], ['pub_count', '2'], ['author_count', '3'], ['net_costs', '100'], ['removed', 'old']]);
        service.announceSortChange({ active: 'pub_count', direction: 'desc' });
        service.updateData().subscribe();
        expect(indexPage).toHaveBeenLastCalledWith(expect.objectContaining({
            q: '123', search_columns: ['id', 'label'], column_filters: { label: 'Name' },
            sort: [{ key: 'pub_count', direction: 'desc' }],
        }), undefined);
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
        expect(service.dataSource).toEqual([{ id: 2 }]);
        expect(service.loading).toBe(false);
    });

    it('reloads the last valid page after its final row was deleted', () => {
        const indexPage = vi.fn()
            .mockReturnValueOnce(of({ items: [], total: 10, page: 1, page_size: 10 }))
            .mockReturnValueOnce(of({ items: [{ id: 1 }], total: 10, page: 0, page_size: 10 }));
        service.init({ indexPage } as any, { buttons: [] }, []);
        service.setPage(1, 10);
        service.updateData().subscribe();
        expect(indexPage).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0 }), undefined);
        expect(service.page).toBe(0);
        expect(service.dataSource).toEqual([{ id: 1 }]);
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

    it('notifies OnPush consumers on start, response and completion', () => {
        const response = new Subject<any>();
        service.init({ indexPage: () => response } as any, { buttons: [] }, []);
        const states: { loading: boolean; rows: any[] }[] = [];
        service.stateChanges$.subscribe(() => states.push({ loading: service.loading, rows: service.dataSource }));
        service.updateData().subscribe();
        response.next({ items: [{ id: 1 }], total: 1, page: 0, page_size: 10 });
        response.complete();
        expect(states).toEqual([
            { loading: true, rows: [] },
            { loading: true, rows: [{ id: 1 }] },
            { loading: false, rows: [{ id: 1 }] },
        ]);
    });

    it('notifies consumers when a request fails synchronously or is unsubscribed', () => {
        const changed = vi.fn();
        service.stateChanges$.subscribe(changed);
        service.init({ indexPage: () => { throw new Error('invalid request'); } } as any, { buttons: [] }, []);
        service.updateData().subscribe({ error: () => undefined });
        expect(service.loading).toBe(false);
        expect(changed).toHaveBeenCalledTimes(2);

        service.init({ indexPage: () => new Subject() } as any, { buttons: [] }, []);
        const subscription = service.updateData().subscribe();
        expect(service.loading).toBe(true);
        subscription.unsubscribe();
        expect(service.loading).toBe(false);
        expect(changed).toHaveBeenCalledTimes(4);
    });
});
