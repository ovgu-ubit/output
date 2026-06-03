import { UntypedFormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { TableComponent } from './table.component';
import { TableDataService } from '../services/table-data.service';
import { TableActionService } from '../services/table-action.service';
import { ChangeDetectorRef } from '@angular/core';

describe('TableComponent', () => {
  function createComponent() {
    const tableDataServiceMock = {
      init: jasmine.createSpy('init'),
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
});
