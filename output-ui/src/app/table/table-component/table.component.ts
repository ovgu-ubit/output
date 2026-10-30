import { SelectionModel } from '@angular/cdk/collections';
import { ComponentType } from '@angular/cdk/portal';
import { Location } from '@angular/common';
import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort, Sort } from '@angular/material/sort';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { catchError, concatMap, debounceTime, map, merge, Observable, of, Subject, take, takeUntil } from 'rxjs';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { ConfigService } from 'src/app/administration/services/config.service';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { EntityFormComponent, EntityService } from 'src/app/services/entities/service.interface';
import { resetViewConfig, selectReportingYear, selectViewConfig, setViewConfig, ViewConfig } from 'src/app/services/redux';
import { TableButton, TableHeader, TableParent, TableRowAction } from 'src/app/table/table.interface';
import {  CompareOperation, JoinOperation  } from '@output/interfaces';
import {  Entity  } from '@output/interfaces';
import { InvoiceIndexEntityFilter, InvoiceIndexQuery } from '@output/interfaces';
import { TableDataService } from '../services/table-data.service';
import { TableActionService } from '../services/table-action.service';

@Component({
    selector: 'appTable',
    templateUrl: './table.component.html',
    styleUrls: ['../table-appearance.css', './table.component.css'],
    standalone: false,
    changeDetection: ChangeDetectionStrategy.Eager,
    providers: [TableDataService, TableActionService]
})
export class TableComponent<T extends Entity, E extends Entity> implements OnInit, OnDestroy, OnChanges {

  @Input() data: Array<T>;
  @Input() wide?: boolean;
  @Input() headers: TableHeader[];
  @Input() id_col: number;
  @Input() name: string;
  @Input() nameSingle: string;
  @Input() icon?: string;
  @Input() publication_table?: boolean = false;

  @Input() combineAlias? = true;
  @Input() softDelete? = false;
  @Input() filter_key? = "";
  @Input() invoice_filter_key?: InvoiceIndexEntityFilter;

  @Input() editFunction? = this.edit.bind(this);
  @Input() addFunction? = this.add.bind(this);
  @Input() deleteable? = true;

  @Input() parent: TableParent<T>;
  @Input() serviceClass: EntityService<E, T>;
  @Input() formComponent: ComponentType<EntityFormComponent<E>>;

  @ViewChild('paginatorTop') paginator: MatPaginator;
  @ViewChild('paginatorBottom') paginator2: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  selection: SelectionModel<T> = new SelectionModel<T>(true, []);
  pageForm: UntypedFormGroup;
  trunc: number = 60;
  headerNames = [];
  headerNamesFilter = [];

  destroy$ = new Subject();
  id;
  viewConfig: ViewConfig;
  reporting_year: number | null;
  private viewConfigApplied = false;

  constructor(
    private formBuilder: UntypedFormBuilder,
    public tokenService: AuthorizationService, 
    private router: Router, 
    private route: ActivatedRoute,
    private configService: ConfigService, 
    private store: Store, 
    private errorPresentation: ErrorPresentationService,
    public tableData: TableDataService<T, E>,
    public tableAction: TableActionService<T, E>,
    private cdr: ChangeDetectorRef
  ) { }

  get loading() { return this.tableData.loading; }
  get dataSource() { return this.tableData.dataSource; }
  get dataSource2() { return this.tableData.dataSource2; }
  get searchControl() { return this.tableData.searchControl; }
  get filterControls() { return this.tableData.filterControls; }
  get rowCount() { return this.tableData.serverSide ? this.tableData.total : this.dataSource.filteredData.length; }

  public ngOnInit(): void {
    this.tableData.init(this.serviceClass, this.parent, this.headers);
    this.tableAction.init({
      serviceClass: this.serviceClass,
      formComponent: this.formComponent,
      nameSingle: this.nameSingle,
      name: this.name,
      softDelete: this.softDelete,
      combineAlias: this.combineAlias
    });

    let ob$: Observable<any> = this.parent.preProcessing ? this.parent.preProcessing() : of(null);

    ob$ = ob$.pipe(concatMap(() => {
      const viewConfig$ = this.publication_table
        ? this.store.select(selectViewConfig).pipe(take(1))
        : of(undefined);
      return viewConfig$.pipe(
        map(viewConfig => {
          if (viewConfig && !this.viewConfigApplied) {
            this.viewConfig = viewConfig;
            this.setViewConfig(viewConfig);
            this.viewConfigApplied = true;
          }
        }),
        concatMap(() => this.store.select(selectReportingYear).pipe(
          concatMap(data => data !== undefined
            ? of(data)
            : this.configService.get("reporting_year").pipe(map(e => e?.value))),
          map(data => {
            this.setReportingYear(data, this.parent.indexOptions?.allReportingYears === true);
            let col = this.headers.find(e => e.colName === 'pub_count');
            if (col) col.colTitle += ' ' + (data ? data : 'ohne Datum')
            col = this.headers.find(e => e.colName === 'pub_count_corr')
            if (col) col.colTitle += ' ' + (data ? data : 'ohne Datum')
            col = this.headers.find(e => e.colName === 'net_costs')
            if (col && !this.publication_table) col.colTitle += ' ' + (data ? data : 'ohne Datum')
            col = this.headers.find(e => e.colName === 'invoice_count');
            if (col) col.colTitle += ' ' + (data ? data : 'ohne Datum');
          }),
          concatMap(() => this.updateData()),
        )),
      );
    }));

    ob$ = merge(ob$, this.route.queryParamMap.pipe(map(params => {
      if (params.get('id')) {
        this.id = params.get('id');
      }
    })))

    this.pageForm = this.formBuilder.group({
      pageNumber: ['', [Validators.required, Validators.pattern("^[0-9]*$")]]
    });

    ob$.pipe(catchError(err => {
      this.errorPresentation.present(err, { action: 'load', entity: this.name });
      return of(null)
    }), takeUntil(this.destroy$)).subscribe(() => {
        if (this.tableData.serverSide) this.syncServerPaginators();
        else {
          if (this.dataSource) this.dataSource.paginator = this.paginator;
          if (this.dataSource2) this.dataSource2.paginator = this.paginator2;
        }
    });

    this.searchControl.valueChanges.pipe(debounceTime(300), takeUntil(this.destroy$)).subscribe(data => {
      if (!data && this.tableData.columnFilter) return;
      if (data) this.tableData.columnFilter = false;
      if (this.tableData.serverSide) {
        this.tableData.resetPage();
        this.reloadServerData();
      } else {
        this.tableData.doFilter(data);
      }
    });

    window.onbeforeunload = () => this.ngOnDestroy();
  }

  ngOnDestroy(): void {
    this.destroy$.next('');
    this.destroy$.complete();
    this.tableData.destroy();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['headers'] && this.headers) {
      this.tableData.setHeaders(this.headers);
      this.headerNames = this.headers
        .filter(col => !col.roles || col.roles.some(role => this.tokenService.hasRole(role)))
        .map(x => x.colName);
      this.headerNames.unshift('edit');
      if (!this.parent.not_selectable) this.headerNames.unshift('select');
      
      this.headerNames.map(e => {
        this.tableData.filterControls[e] = new FormControl('');
        this.tableData.filterControls[e].valueChanges
          .pipe(debounceTime(300), takeUntil(this.destroy$))
          .subscribe(value => {
            this.tableData.columnFilter = true;
            this.searchControl.setValue('');
            this.tableData.filterValues.set(e, value);
            let filter = new Object();
            this.tableData.filterValues.forEach((val, key) => {
              (filter as any)[key] = val?.trim().toLocaleLowerCase();
            });
            if (this.tableData.serverSide) {
              this.tableData.resetPage();
              this.reloadServerData();
            } else {
              this.dataSource.filter = JSON.stringify(filter);
              this.dataSource2.filter = JSON.stringify(filter);
            }
          });
        this.tableData.filterControls[e].setValue(this.tableData.filterValues.get(e) ?? '', { emitEvent: false });
      });
      this.headerNamesFilter = this.headerNames.map(x => x + "-filter");
      if (this.id) {
        this.edit({ id: this.id });
        this.id = undefined;
      }
    }
    if (changes['data'] && changes['data'].currentValue) {
      this.tableData.update(changes['data'].currentValue);
      this.selection.clear();
      this.dataSource.paginator = this.paginator;
      this.dataSource2.paginator = this.paginator2;
      if (this.viewConfig) this.setViewConfig(this.viewConfig);
    }
  }

  getName(): string {
    if (this.tableData.filterName && this.publication_table) return 'Gefilterte Publikationen';
    if (this.tableData.filterName) return "Gefilterte " + this.name.substring(0, this.name.indexOf(" "));
    else return this.name;
  }

  setReportingYear(reportingYear: number | null, allReportingYears = false): void {
    this.reporting_year = reportingYear;
    this.tableData.setReportingYear(reportingYear);

    if (!this.publication_table) return;
    if (allReportingYears) this.name = 'Alle Publikationen';
    else if (reportingYear) this.name = 'Publikationen des Jahres ' + reportingYear;
    else this.name = 'Publikationen ohne Datumsangabe';
  }

  public updateData() {
    return this.tableData.updateData().pipe(
      concatMap(data => this.parent.afterDataLoaded ? this.parent.afterDataLoaded(data) : of(undefined)),
      map(() => {
        this.selection.clear();
        if (this.tableData.serverSide) this.syncServerPaginators();
        else {
          this.dataSource.paginator = this.paginator;
          this.dataSource2.paginator = this.paginator2;
        }
        this.cdr.detectChanges();
      })
    );
  }

  edit(row: any) {
    this.tableAction.edit(row, () => this.updateData());
  }

  runRowAction(event: Event, action: TableRowAction<T>, row: T): void {
    event.stopPropagation();
    if (!this.isRowActionVisible(action, row) || this.isRowActionDisabled(action, row)) return;
    action.action(row);
  }

  isRowActionVisible(action: TableRowAction<T>, row: T): boolean {
    return action.visible ? action.visible(row) : true;
  }

  isRowActionDisabled(action: TableRowAction<T>, row: T): boolean {
    return action.disabled ? action.disabled(row) : false;
  }

  getRowActionTooltip(action: TableRowAction<T>, row: T): string {
    return typeof action.tooltip === 'function' ? action.tooltip(row) : action.tooltip;
  }

  add() {
    this.tableAction.add(() => this.updateData());
  }

  delete() {
    this.tableAction.delete(this.selection.selected, () => this.updateData());
  }

  combine() {
    this.tableAction.combine(this.selection.selected, () => this.updateData());
  }

  async showPubs?(id: number, field?: string) {
    let filterkey = null;
    let date_filter;
    if (this.reporting_year) {
      date_filter = [{
        op: JoinOperation.AND,
        key: 'pub_date',
        comp: CompareOperation.GREATER_THAN,
        value: (Number(this.reporting_year) - 1) + '-12-31 23:59:59'
      }, {
        op: JoinOperation.AND,
        key: 'pub_date',
        comp: CompareOperation.SMALLER_THAN,
        value: (Number(this.reporting_year) + 1) + '-01-01 00:00:00'
      }];
    } else {
      date_filter = [{
        op: JoinOperation.AND,
        key: 'pub_date',
        comp: CompareOperation.EQUALS,
        value: null
      }];
    }

    filterkey = this.filter_key;
    if (field === 'pub_count_corr') filterkey = this.filter_key + '_corr';
    else if (field === 'pub_count_total') {
      date_filter = [];
    }
    this.store.dispatch(resetViewConfig());
    let viewConfig: ViewConfig = {
      sortState: [],
      filterColumn: new Map<string, string>(),
      filter: {
        filter: {
          expressions: [{
            op: JoinOperation.AND,
            key: filterkey,
            comp: CompareOperation.EQUALS,
            value: id
          }, ...date_filter]
        }
      }
    };
    this.store.dispatch(setViewConfig({ viewConfig }));
    this.router.navigateByUrl('publications');
  }

  filterAvailable(col: TableHeader) {
    return (col.type !== 'pubs' && col.type !== 'invoices' && col.type !== 'date' && col.type !== 'datetime' && col.type !== 'route-link');
  }

  invoiceQueryParams(id: number, field: string): InvoiceIndexQuery {
    if (!this.invoice_filter_key) return {};
    const params: InvoiceIndexQuery = { [this.invoice_filter_key]: id };
    if (field === 'invoice_count') {
      if (this.reporting_year) params.invoice_year = Number(this.reporting_year);
      else params.invoice_date_missing = true;
    }
    return params;
  }

  public getCellTooltip(row: T, col: TableHeader): string | null {
    if (!col.tooltip) return null;
    const tooltip = typeof col.tooltip === 'function' ? col.tooltip(row) : col.tooltip;
    return tooltip || null;
  }

  announceSortChange(sortState: Sort) {
    this.tableData.announceSortChange(sortState);
    if (this.tableData.serverSide) {
      this.tableData.resetPage();
      this.reloadServerData();
    } else {
      this.dataSource.paginator = this.paginator;
    }
  }

  renderHeader(col): { text: string, asc: boolean } {
    let sort = { text: '', asc: null };
    for (let i = 0; i < this.tableData.sort_state.length; i++) {
      if (this.tableData.sort_state[i].key === col.colName) {
        sort.text = (i + 1) + "";
        if (this.tableData.sort_state[i].dir === 'asc') (sort as any).asc = true;
        else (sort as any).asc = false;
        break;
      }
    }
    return sort;
  }

  goToPage() {
    const requestedPage = Number(this.pageForm.controls.pageNumber.value);
    if (!Number.isInteger(requestedPage) || requestedPage < 1) {
      this.pageForm.controls.pageNumber.setValue('');
      return;
    }
    const lastPageIndex = Math.max(0, Math.ceil(this.paginator.length / this.paginator.pageSize) - 1);
    this.paginator.pageIndex = Math.min(requestedPage - 1, lastPageIndex);
    this.paginator.page.next({
      pageIndex: this.paginator.pageIndex,
      pageSize: this.paginator.pageSize,
      length: this.paginator.length
    });
    this.pageForm.controls.pageNumber.setValue(this.paginator.pageIndex + 1);
  }

  getViewConfig(): ViewConfig {
    let res: ViewConfig = {
      sortState: this.tableData.sort_state,
      page: this.paginator.pageIndex,
      pageSize: this.paginator.pageSize,
      filterValue: this.searchControl.value,
      filterColumn: this.tableData.filterValues,
      allReportingYears: this.parent.indexOptions?.allReportingYears === true,
    };
    return res;
  }

  resetView() {
    this.viewConfig = {
      sortState: [],
      filterColumn: new Map<string, string>(),
      filterValue: '',
      page: 0,
      pageSize: 10
    };

    this.tableData.sort_state = [];
    this.tableData.filterValues = new Map<string, string>();
    this.tableData.columnFilter = false;
    this.tableData.setPage(0, 10);

    this.searchControl.setValue('', { emitEvent: false });
    Object.values(this.filterControls).forEach(control => {
      control.setValue('', { emitEvent: false });
    });
    this.dataSource.filter = '';
    this.dataSource2.filter = '';

    if (this.paginator) {
      this.paginator.pageIndex = 0;
      this.paginator.pageSize = 10;
    }
    if (this.paginator2) {
      this.paginator2.pageIndex = 0;
      this.paginator2.pageSize = 10;
    }
  }

  resetPage(): void {
    this.tableData.resetPage();
    this.syncServerPaginators();
  }

  setViewConfig(viewConfig: ViewConfig) {
    if (this.tableData.serverSide) {
      this.tableData.sort_state = viewConfig.sortState ?? [];
      this.tableData.filterValues = viewConfig.filterColumn instanceof Map
        ? new Map(viewConfig.filterColumn)
        : new Map(Object.entries(viewConfig.filterColumn ?? {}));
      const searchValue = viewConfig.filterValue ?? '';
      this.tableData.columnFilter = !searchValue;
      this.searchControl.setValue(searchValue, { emitEvent: false });
      for (const col of this.headerNames) {
        this.filterControls[col]?.setValue(this.tableData.filterValues.get(col) ?? '', { emitEvent: false });
      }
      this.tableData.setPage(viewConfig.page ?? 0, viewConfig.pageSize ?? 10);
      this.syncServerPaginators();
      return;
    }
    this.paginator.pageIndex = viewConfig.page !== null && viewConfig.page !== undefined ? viewConfig.page : this.paginator.pageIndex;
    this.paginator.pageSize = viewConfig.pageSize ? viewConfig.pageSize : this.paginator.pageSize;
    this.paginator.page.next({
      pageIndex: this.paginator.pageIndex,
      pageSize: this.paginator.pageSize,
      length: this.dataSource.data.length
    });

    this.paginator2.pageIndex = viewConfig.page ? viewConfig.page : this.paginator2.pageIndex;
    this.paginator2.pageSize = viewConfig.pageSize ? viewConfig.pageSize : this.paginator2.pageSize;
    this.paginator2.page.next({
      pageIndex: this.paginator2.pageIndex,
      pageSize: this.paginator2.pageSize,
      length: this.dataSource2?.data.length
    });
    
    let searchValue = viewConfig.filterValue ? viewConfig.filterValue : '';
    if (searchValue) this.tableData.columnFilter = false;
    else this.tableData.columnFilter = true;
    this.searchControl.setValue(searchValue);
    
    this.tableData.filterValues = viewConfig.filterColumn;
    if (this.tableData.filterValues.get) {
        for (let col of this.headerNames) {
            if (this.tableData.filterValues.get(col)) this.filterControls[col].setValue(this.tableData.filterValues.get(col));
            else this.filterControls[col].setValue('');
        }
    }
    this.tableData.sort_state = viewConfig.sortState;
  }

  isButtonDisabled(e: TableButton) {
    return e.roles && !this.hasRole(e.roles);
  }

  hasRole(roles: string[]) {
    return roles.some(r => this.tokenService.hasRole(r));
  }

  public handlePage(event: PageEvent) {
    this.paginator.pageIndex = event.pageIndex;
    this.paginator2.pageIndex = event.pageIndex;
    
    this.paginator.pageSize = event.pageSize;
    this.paginator2.pageSize = event.pageSize;

    if (this.tableData.serverSide) {
      this.tableData.setPage(event.pageIndex, event.pageSize);
      this.reloadServerData();
      return;
    }

    this.dataSource.paginator = this.paginator;
    this.dataSource._updateChangeSubscription();
  }

  private reloadServerData(): void {
    this.updateData().pipe(catchError(err => {
      this.errorPresentation.present(err, { action: 'load', entity: this.name });
      return of(null);
    }), takeUntil(this.destroy$)).subscribe();
  }

  private syncServerPaginators(): void {
    for (const paginator of [this.paginator, this.paginator2]) {
      if (!paginator) continue;
      paginator.length = this.tableData.total;
      paginator.pageIndex = this.tableData.page;
      paginator.pageSize = this.tableData.pageSize;
    }
  }
}
