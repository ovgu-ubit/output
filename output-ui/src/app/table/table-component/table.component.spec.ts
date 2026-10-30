import { FormControl, UntypedFormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { TableComponent } from './table.component';
import { TableDataService } from '../services/table-data.service';
import { TableActionService } from '../services/table-action.service';
import { ChangeDetectorRef, SimpleChange } from '@angular/core';
import { TableRowAction } from '../table.interface';

describe('TableComponent', () => {
    function createComponent() {
        const tableDataServiceMock = {
            init: vi.fn().mockName('init'),
            setHeaders: vi.fn().mockName('setHeaders'),
            setReportingYear: vi.fn().mockName('setReportingYear'),
            destroy: vi.fn().mockName('destroy'),
            update: vi.fn().mockName('update'),
            updateData: vi.fn().mockName('updateData').mockReturnValue(of([])),
            doFilter: vi.fn().mockName('doFilter'),
            announceSortChange: vi.fn().mockName('announceSortChange'),
            setPage: vi.fn().mockName('setPage'),
            resetPage: vi.fn().mockName('resetPage'),
            sort_state: [],
            filterValues: new Map(),
            searchControl: { valueChanges: of(''), value: '', setValue: vi.fn().mockName('setValue') },
            filterControls: {},
            columnFilter: false,
            dataSource: { filter: '', data: [], filteredData: [], _updateChangeSubscription: vi.fn().mockName('_updateChangeSubscription') },
            dataSource2: { filter: '', data: [], filteredData: [] },
            loading: false,
            filterName: false,
            serverSide: false,
            total: 0,
            page: 0,
            pageSize: 10,
        };

        const tableActionServiceMock = {
            init: vi.fn().mockName('init'),
            edit: vi.fn().mockName('edit'),
            add: vi.fn().mockName('add'),
            delete: vi.fn().mockName('delete'),
            combine: vi.fn().mockName('combine')
        };

        const dependencies = [new UntypedFormBuilder(), {
            hasRole: vi.fn().mockName("AuthorizationService.hasRole")
        }, {
            navigateByUrl: vi.fn().mockName("Router.navigateByUrl")
        }, {
            queryParamMap: of(new Map())
        }, {
            get: vi.fn().mockName("ConfigService.get")
        }, {
            select: vi.fn().mockName("Store.select"),
            dispatch: vi.fn().mockName("Store.dispatch")
        }, {
            present: vi.fn().mockName("ErrorPresentationService.present")
        }, tableDataServiceMock as any, tableActionServiceMock as any, {
            detectChanges: vi.fn().mockName("ChangeDetectorRef.detectChanges")
        }] as unknown as ConstructorParameters<typeof TableComponent>;
        const component = new TableComponent(...dependencies);

        component.serviceClass = {} as never;
        component.formComponent = {} as never;
        component.nameSingle = 'Status';
        component.parent = {} as never;

        return { component, tableActionServiceMock, tableDataServiceMock };
    }

    it('delegates edit to TableActionService', () => {
        const { component, tableActionServiceMock } = createComponent();

        const row = { id: 1 };
        component.edit(row);

        expect(tableActionServiceMock.edit).toHaveBeenCalledWith(row, expect.any(Function));
    });

    it('delegates add to TableActionService', () => {
        const { component, tableActionServiceMock } = createComponent();

        component.add();

        expect(tableActionServiceMock.add).toHaveBeenCalledWith(expect.any(Function));
    });

    it('executes visible and enabled row actions with the selected row', () => {
        const { component } = createComponent();
        const row = { id: 1 };
        const action: TableRowAction<any> = {
            icon: 'play_arrow',
            tooltip: (selected) => `Start ${selected.id}`,
            action: vi.fn().mockName('action'),
        };
        const event = new Event('click');
        vi.spyOn(event, 'stopPropagation');

        component.runRowAction(event, action, row);

        expect(event.stopPropagation).toHaveBeenCalled();
        expect(action.action).toHaveBeenCalledWith(row);
        expect(component.getRowActionTooltip(action, row)).toBe('Start 1');
    });

    it('runs parent post-processing after table data was loaded', () => {
        const { component, tableDataServiceMock } = createComponent();
        const rows = [{ id: 1 }];
        const afterDataLoaded = vi.fn().mockName('afterDataLoaded').mockReturnValue(of(undefined));
        tableDataServiceMock.updateData.mockReturnValue(of(rows));
        component.parent = { buttons: [], afterDataLoaded };

        component.updateData().subscribe();

        expect(afterDataLoaded).toHaveBeenCalledWith(rows);
    });

    it('does not execute hidden or disabled row actions', () => {
        const { component } = createComponent();
        const row = { id: 1 };
        const event = new Event('click');
        vi.spyOn(event, 'stopPropagation');
        const hiddenAction: TableRowAction<any> = {
            icon: 'play_arrow',
            tooltip: 'Hidden',
            action: vi.fn().mockName('hiddenAction'),
            visible: () => false,
        };
        const disabledAction: TableRowAction<any> = {
            icon: 'play_arrow',
            tooltip: 'Disabled',
            action: vi.fn().mockName('disabledAction'),
            disabled: () => true,
        };

        component.runRowAction(event, hiddenAction, row);
        component.runRowAction(event, disabledAction, row);

        expect(hiddenAction.action).not.toHaveBeenCalled();
        expect(disabledAction.action).not.toHaveBeenCalled();
    });

    it('syncs changed headers to TableDataService', () => {
        const { component, tableDataServiceMock } = createComponent();
        component.headers = [{ colName: 'status', colTitle: 'Status', type: 'number' }];

        component.ngOnChanges({
            headers: new SimpleChange(undefined, component.headers, true)
        });

        expect(tableDataServiceMock.setHeaders).toHaveBeenCalledWith(component.headers);
    });

    it('syncs the reporting year and labels the all-years publication view', () => {
        const { component, tableDataServiceMock } = createComponent();
        component.publication_table = true;

        component.setReportingYear(2025, true);

        expect(component.reporting_year).toBe(2025);
        expect(tableDataServiceMock.setReportingYear).toHaveBeenCalledWith(2025);
        expect(component.getName()).toBe('Alle Publikationen');
    });

    it('labels publications without a reporting date', () => {
        const { component, tableDataServiceMock } = createComponent();
        component.publication_table = true;

        component.setReportingYear(null, false);

        expect(tableDataServiceMock.setReportingYear).toHaveBeenCalledWith(null);
        expect(component.getName()).toBe('Publikationen ohne Datumsangabe');
    });

    it('resets column filters and their visible controls', () => {
        const { component, tableDataServiceMock } = createComponent();
        const titleFilter = new FormControl('angular');
        tableDataServiceMock.filterControls = { title: titleFilter };
        tableDataServiceMock.filterValues = new Map([['title', 'angular']]);
        tableDataServiceMock.columnFilter = true;
        tableDataServiceMock.dataSource.filter = JSON.stringify({ title: 'angular' });
        tableDataServiceMock.dataSource2.filter = JSON.stringify({ title: 'angular' });

        component.resetView();

        expect(titleFilter.value).toBe('');
        expect(tableDataServiceMock.filterValues.size).toBe(0);
        expect(tableDataServiceMock.columnFilter).toBe(false);
        expect(tableDataServiceMock.dataSource.filter).toBe('');
        expect(tableDataServiceMock.dataSource2.filter).toBe('');
    });

    for (const filter of ['contract_id', 'cost_center_id', 'cost_type_id'] as const) {
        it(`creates independent invoice links for ${filter} without changing publication state`, () => {
            const { component } = createComponent();
            component.invoice_filter_key = filter;
            component.reporting_year = 2026;
            expect(component.invoiceQueryParams(42, 'invoice_count')).toEqual({ [filter]: 42, invoice_year: 2026 });
            expect(component.invoiceQueryParams(42, 'invoice_count_total')).toEqual({ [filter]: 42 });
            component.reporting_year = null;
            expect(component.invoiceQueryParams(42, 'invoice_count')).toEqual({ [filter]: 42, invoice_date_missing: true });
            expect(component.invoiceQueryParams(42, 'invoice_count_total')).toEqual({ [filter]: 42 });
            expect((component as any).store.dispatch).not.toHaveBeenCalled();
        });
    }
});
