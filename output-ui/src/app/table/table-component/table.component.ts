import { SelectionModel } from '@angular/cdk/collections';
import { ComponentType } from '@angular/cdk/portal';
import { Location } from '@angular/common';
import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild, ChangeDetectorRef } from '@angular/core';
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
import { TableButton, TableHeader, TableParent } from 'src/app/table/table.interface';
import {  CompareOperation, JoinOperation  } from '@output/interfaces';
import {  Entity  } from '@output/interfaces';
import { TableDataService } from '../services/table-data.service';
import { TableActionService } from '../services/table-action.service';

@Component({
    selector: 'appTable',
    templateUrl: './table.component.html',
    styleUrls: ['./table.component.css'],
    standalone: false,
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
  reporting_year: number;

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

    ob$ = ob$.pipe(concatMap(data => {
      return this.store.select(selectReportingYear).pipe(concatMap(data => {
        if (data !== undefined) {
          return of(data)
        } else {
          return this.configService.get("reporting_year").pipe(map(e => e?.value));
        }
      }), map(data => {
        this.reporting_year = data;
        this.tableData.setReportingYear(data);
        if (this.publication_table) {
          if (this.reporting_year) this.name = 'Publikationen des Jahres ' + this.reporting_year;
          else this.name = 'Publikationen ohne Datumsangabe'
        }
        let col = this.headers.find(e => e.colName === 'pub_count');
        if (col) col.colTitle += ' ' + (data ? data : 'ohne Datum')
        col = this.headers.find(e => e.colName === 'pub_count_corr')
        if (col) col.colTitle += ' ' + (data ? data : 'ohne Datum')
        col = this.headers.find(e => e.colName === 'net_costs')
        if (col) col.colTitle += ' ' + (data ? data : 'ohne Datum')
      }), concatMap(data => this.updateData()))
    }));

    ob$ = merge(ob$, this.route.queryParamMap.pipe(map(params => {
      if (params.get('id')) {
        this.id = params.get('id');
      }
    })))

    if (this.publication_table) ob$ = merge(ob$, this.store.select(selectViewConfig).pipe(take(1), map(data => this.viewConfig = data)));

    this.pageForm = this.formBuilder.group({
      pageNumber: ['', [Validators.required, Validators.pattern("^[0-9]*$")]]
    });

    ob$.pipe(catchError(err => {
      this.errorPresentation.present(err, { action: 'load', entity: this.name });
      return of(null)
    }), takeUntil(this.destroy$)).subscribe(() => {
        if (this.dataSource) this.dataSource.paginator = this.paginator;
        if (this.dataSource2) this.dataSource2.paginator = this.paginator2;
    });

    this.searchControl.valueChanges.pipe(debounceTime(300), takeUntil(this.destroy$)).subscribe(data => {
      if (!data && this.tableData.columnFilter) return;
      if (data) this.tableData.columnFilter = false;
      this.tableData.doFilter(data);
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
      this.headerNames = this.headers.map(x => x.colName);
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
            this.dataSource.filter = JSON.stringify(filter);
            this.dataSource2.filter = JSON.stringify(filter);
          });
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
    if (this.tableData.filterName) return "Gefilterte " + this.name.substring(0, this.name.indexOf(" "));
    else return this.name;
  }

  public updateData() {
    return this.tableData.updateData().pipe(map(() => {
      this.selection.clear();
      this.dataSource.paginator = this.paginator;
      this.dataSource2.paginator = this.paginator2;
      this.cdr.detectChanges();
    }));
  }

  edit(row: any) {
    this.tableAction.edit(row, () => this.updateData());
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
    return (col.type !== 'pubs' && col.type !== 'date' && col.type !== 'datetime' && col.type !== 'route-link');
  }

  public getCellTooltip(row: T, col: TableHeader): string | null {
    if (!col.tooltip) return null;
    const tooltip = typeof col.tooltip === 'function' ? col.tooltip(row) : col.tooltip;
    return tooltip || null;
  }

  announceSortChange(sortState: Sort) {
    this.tableData.announceSortChange(sortState);
    this.dataSource.paginator = this.paginator;
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
    let page = null;
    if (this.paginator.length <= this.pageForm.controls.pageNumber.value * this.paginator.pageSize) {
        page = Math.floor(this.paginator.length / this.paginator.pageSize);
    } else {
        page = this.pageForm.controls.pageNumber.value;
    }
    
    if (Number.isNaN(page) || !Number.isInteger(Number(page))) {
      this.pageForm.controls.pageNumber.setValue('');
      return;
    }
    this.paginator.pageIndex = Number(page) - 1;
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
      filterColumn: this.tableData.filterValues
    };
    return res;
  }

  setViewConfig(viewConfig: ViewConfig) {
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

    this.dataSource.paginator = this.paginator;
    this.dataSource._updateChangeSubscription();
  }
}
