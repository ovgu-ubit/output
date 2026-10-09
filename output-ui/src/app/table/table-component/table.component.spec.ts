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
      init: jasmine.createSpy('init'),
      setHeaders: jasmine.createSpy('setHeaders'),
      setReportingYear: jasmine.createSpy('setReportingYear'),
      destroy: jasmine.createSpy('destroy'),
      update: jasmine.createSpy('update'),
      updateData: jasmine.createSpy('updateData').and.returnValue(of([])),
      doFilter: jasmine.createSpy('doFilter'),
      announceSortChange: jasmine.createSpy('announceSortChange'),
      sort_state: [],
      filterValues: new Map(),
      searchControl: { valueChanges: of(''), value: '', setValue: jasmine.createSpy('setValue') },
      filterControls: {},
      columnFilter: false,
      dataSource: { filter: '', data: [], _updateChangeSubscription: jasmine.createSpy('_updateChangeSubscription') },
      dataSource2: { filter: '', data: [] },
      loading: false,
      filterName: false
    };

    const tableActionServiceMock = {
      init: jasmine.createSpy('init'),
      edit: jasmine.createSpy('edit'),
      add: jasmine.createSpy('add'),
      delete: jasmine.createSpy('delete'),
      combine: jasmine.createSpy('combine')
    };

    const component = new TableComponent(
      new UntypedFormBuilder(),
      jasmine.createSpyObj('AuthorizationService', ['hasRole']),
      jasmine.createSpyObj('Router', ['navigateByUrl']),
      jasmine.createSpyObj('ActivatedRoute', [], { queryParamMap: of(new Map()) }),
      jasmine.createSpyObj('ConfigService', ['get']),
      jasmine.createSpyObj('Store', ['select', 'dispatch']),
      jasmine.createSpyObj('ErrorPresentationService', ['present']),
      tableDataServiceMock as any,
      tableActionServiceMock as any,
      jasmine.createSpyObj('ChangeDetectorRef', ['detectChanges'])
    );

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

    expect(tableActionServiceMock.edit).toHaveBeenCalledWith(row, jasmine.any(Function));
  });

  it('delegates add to TableActionService', () => {
    const { component, tableActionServiceMock } = createComponent();

    component.add();

    expect(tableActionServiceMock.add).toHaveBeenCalledWith(jasmine.any(Function));
  });

  it('executes visible and enabled row actions with the selected row', () => {
    const { component } = createComponent();
    const row = { id: 1 };
    const action: TableRowAction<any> = {
      icon: 'play_arrow',
      tooltip: (selected) => `Start ${selected.id}`,
      action: jasmine.createSpy('action'),
    };
    const event = jasmine.createSpyObj<Event>('Event', ['stopPropagation']);

    component.runRowAction(event, action, row);

    expect(event.stopPropagation).toHaveBeenCalled();
    expect(action.action).toHaveBeenCalledWith(row);
    expect(component.getRowActionTooltip(action, row)).toBe('Start 1');
  });

  it('runs parent post-processing after table data was loaded', () => {
    const { component, tableDataServiceMock } = createComponent();
    const rows = [{ id: 1 }];
    const afterDataLoaded = jasmine.createSpy('afterDataLoaded').and.returnValue(of(undefined));
    tableDataServiceMock.updateData.and.returnValue(of(rows));
    component.parent = { buttons: [], afterDataLoaded };

    component.updateData().subscribe();

    expect(afterDataLoaded).toHaveBeenCalledWith(rows);
  });

  it('does not execute hidden or disabled row actions', () => {
    const { component } = createComponent();
    const row = { id: 1 };
    const event = jasmine.createSpyObj<Event>('Event', ['stopPropagation']);
    const hiddenAction: TableRowAction<any> = {
      icon: 'play_arrow',
      tooltip: 'Hidden',
      action: jasmine.createSpy('hiddenAction'),
      visible: () => false,
    };
    const disabledAction: TableRowAction<any> = {
      icon: 'play_arrow',
      tooltip: 'Disabled',
      action: jasmine.createSpy('disabledAction'),
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
    expect(tableDataServiceMock.columnFilter).toBeFalse();
    expect(tableDataServiceMock.dataSource.filter).toBe('');
    expect(tableDataServiceMock.dataSource2.filter).toBe('');
  });
});
