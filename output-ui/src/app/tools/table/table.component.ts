import { SelectionModel } from '@angular/cdk/collections';
import { ComponentType } from '@angular/cdk/portal';
import { Location } from '@angular/common';
import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { FormControl, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorIntl, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort, Sort, SortDirection } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { catchError, concatMap, debounceTime, map, merge, Observable, of, Subject, take, takeUntil } from 'rxjs';
import { Alert } from 'src/app/interfaces/alert';
import { EntityFormComponent, EntityService } from 'src/app/interfaces/service';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { resetViewConfig, selectReportingYear, selectViewConfig, setViewConfig, ViewConfig } from 'src/app/services/redux';
import { CompareOperation, JoinOperation } from '../../../../../output-interfaces/Config';
import { Entity } from '../../../../../output-interfaces/Publication';
import { CombineDialogComponent } from '../combine-dialog/combine-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogModel } from '../confirm-dialog/confirm-dialog.component';

export class CustomPaginator extends MatPaginatorIntl {
  constructor() {
    super();
    this.itemsPerPageLabel = 'Elemente pro Seite';
    this.firstPageLabel = 'Erste Seite';
    this.previousPageLabel = 'Vorherige Seite';
    this.nextPageLabel = 'Nächste Seite';
    this.lastPageLabel = 'Letzte Seite'
  }
}

/**
 * component using material tables to show table and header toolbar with customizable buttons
 */
@Component({
  selector: 'appTable',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss']
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

  @Input() parent: TableParent<T>;
  @Input() serviceClass: EntityService<E, T>;
  @Input() formComponent: ComponentType<EntityFormComponent<E>>;

  @ViewChild('paginatorTop') paginator: MatPaginator;
  @ViewChild('paginatorBottom') paginator2: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  loading: boolean;
  reporting_year: number;

  selection: SelectionModel<T> = new SelectionModel<T>(true, []);

  pageForm: UntypedFormGroup;

  trunc: number = 60;
  headerNames = [];
  headerNamesFilter = [];
  dataSource: MatTableDataSource<T>;
  dataSource2: MatTableDataSource<T>;
  alerts: Alert[] = [];

  destroy$ = new Subject();

  id;
  public indexOptions: any;
  viewConfig: ViewConfig;

  filterValues: Map<string, string> = new Map();

  filterControls: { [key: string]: FormControl } = {};
  searchControl = new FormControl('')
  columnFilter: boolean;

  constructor(private formBuilder: UntypedFormBuilder, private _snackBar: MatSnackBar, private dialog: MatDialog,
    public tokenService: AuthorizationService, private location: Location, private router: Router, private route: ActivatedRoute,
    private publicationService: PublicationService, private store: Store) { }

  public ngOnInit(): void {
    this.loading = true;
    let ob$: Observable<any> = this.parent.preProcessing ? this.parent.preProcessing() : of(null);

    ob$ = ob$.pipe(concatMap(data => {
      return this.store.select(selectReportingYear).pipe(concatMap(data => {
        if (data !== undefined) {
          return of(data)
        } else {
          return this.publicationService.getDefaultReportingYear();
        }
      }), map(data => {
        this.reporting_year = data;
        if (this.publication_table) {
          if (this.reporting_year) this.name = 'Publikationen des Jahres ' + this.reporting_year;
          else this.name = 'Publikationen ohne Datumsangabe'
        }
        let col = this.headers.find(e => e.colName === 'pub_count');
        if (col) col.colTitle += ' ' + (data ? data : 'ohne Datum')
        col = this.headers.find(e => e.colName === 'pub_count_corr')
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
    this.dataSource = new MatTableDataSource<T>(this.data);
    this.dataSource.paginator = this.paginator;

    ob$.pipe(catchError(err => {
      this._snackBar.open(`Unerwarter Fehler (siehe Konsole)`, 'Oh oh!', {
        panelClass: [`danger-snackbar`],
        verticalPosition: 'top'
      })
      console.log(err)
      return of(null)
    }), takeUntil(this.destroy$)).subscribe();

    this.searchControl.valueChanges.pipe(debounceTime(300)).subscribe(data => {
      if (!data && this.columnFilter) return
      if (data) this.columnFilter = false;
      this.doFilter(data)
    })

    window.onbeforeunload = () => this.ngOnDestroy();
  }

  ngOnDestroy(): void {
    this.destroy$.next('');
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['headers']) {
      //populate the headerNames field for template access
      this.headerNames = this.headers.map(x => x.colName);
      //adding the meta columns at the beginning
      this.headerNames.unshift('edit');
      if (!this.parent.not_selectable) this.headerNames.unshift('select');
      this.headerNames.map(e => {
        this.filterControls[e] = new FormControl('')
        this.filterControls[e].valueChanges
          .pipe(debounceTime(300)) // 300ms Verzögerung
          .subscribe(value => {
            if (!this.filterValues.set) this.filterValues = new Map<string, string>();
            this.columnFilter = true;
            this.searchControl.setValue('')
            this.filterValues.set(e, value)
            let filter = new Object();
            this.filterValues.forEach((value, key) => {
              filter[key] = value?.trim().toLocaleLowerCase();
            })
            this.dataSource.filter = JSON.stringify(filter);
            this.dataSource2.filter = JSON.stringify(filter);
          })
      })
      this.headerNamesFilter = this.headerNames.map(x => x + "-filter");
      if (this.id) {
        this.edit({ id: this.id });
      }
    }
    if (changes['data']) {
      this.update(changes['data'].currentValue)
    }
  }

  filterName = false;
  getName(): string {
    if (this.filterName) return "Gefilterte " + this.name.substring(0, this.name.indexOf(" "));
    else return this.name;
  }

  /**
   * updates the view with new data
   * @param data the data to be displayed
   */
  private update(data): void {
    if ((this.parent.indexOptions?.filter && this.parent.indexOptions?.filter.expressions?.length > 0) || (this.parent.indexOptions?.paths && this.parent.indexOptions?.paths.length > 0)) this.filterName = true;
    else this.filterName = false;
    this.data = data;
    this.dataSource = new MatTableDataSource<T>(data);
    this.dataSource2 = new MatTableDataSource<T>(data);
    this.dataSource.paginator = this.paginator;
    this.dataSource2.paginator = this.paginator2;
    this.selection.clear();
    this.dataSource.filterPredicate = function (data, filter): boolean {
      let filterJSON
      try {
        filterJSON = JSON.parse(filter)
      } catch (err) { filterJSON = filter; }
      if (typeof filterJSON === 'string' || typeof filterJSON === 'number') {
        if (filter.includes("*") || filter.includes("?")) {
          let regex = "^" + filter.replaceAll("*", ".*").replaceAll("?", ".");
          let regexp = new RegExp(regex);
          for (let key of Object.keys(data)) {
            if (data[key]?.toString().toLowerCase().match(regexp)) return true;
          }
          return false;
        }
        else {
          for (let key of Object.keys(data)) {
            if (data[key]?.toString().toLowerCase().includes(filter)) return true;
          }
          return false;
        }
      } else {
        let result = true
        for (let key of Object.keys(filterJSON)) {
          if (!filterJSON[key]) continue;
          if (this.headers.find(e => e.colName === key)?.type === 'number') filterJSON[key] = filterJSON[key].replaceAll("\.", "");
          if (this.headers.find(e => e.colName === key)?.type === 'euro') filterJSON[key] = filterJSON[key].replaceAll(" €", "");
          if (filterJSON[key] && !(filterJSON[key].includes("*") || filterJSON[key].includes("?"))) result = result && (data[key]?.toString().toLowerCase().includes(filterJSON[key]))
          else {
            let regex = filterJSON[key].replaceAll("*", ".*").replaceAll("?", ".");
            let regexp = new RegExp(regex);
            result = result && (data[key]?.toString().toLowerCase().match(regexp))
          }
        }
        return result;
      }
    }.bind(this);
    this.dataSource2.filterPredicate = this.dataSource.filterPredicate;
    this.dataSource.data = this.dataSource.data.sort((a, b) => {
      for (let i = 0; i < this.sort_state.length; i++) {
        let type = this.headers.find(e => e.colName === this.sort_state[i].key).type
        let compare = this.compare(type, a[this.sort_state[i].key], b[this.sort_state[i].key], this.sort_state[i].dir);
        if (compare !== 0) return compare;
      }
      return 0;
    })
    if (this.viewConfig) this.setViewConfig(this.viewConfig)
  }

  public updateData() {
    return this.serviceClass.index(this.reporting_year, this.parent.indexOptions).pipe(map(data => {
      this.loading = false;
      this.data = data;
      this.update(data);
    }))
  }

  edit(row: any) {
    this.location.replaceState(this.router.url.split('?')[0], 'id=' + row.id)
    // define Entity Form dialog by id to enforce edit mode
    let dialogRef = this.dialog.open(this.formComponent, {
      width: '1000px',
      maxHeight: '800px',
      data: {
        entity: { id: row.id }
      },
      disableClose: true
    });
    dialogRef.afterClosed().pipe(concatMap(result => {
      this.location.replaceState(this.router.url.split('?')[0])
      this.id = null;
      // three possible results: null (canceled), only id (not longer locked and not changed), full object (not longer locked and changed)
      if (result && result.updated) {
        return this.serviceClass.update(result).pipe(concatMap(data => {
          this._snackBar.open(`${this.nameSingle} geändert`, 'Super!', {
            duration: 5000,
            panelClass: [`success-snackbar`],
            verticalPosition: 'top'
          })
          this.loading = true;
          return this.updateData();
        }))
      } else if (result && result.id) {
        return this.serviceClass.update(result);
      } else return of(null)
    })).pipe(catchError(err => {
      this._snackBar.open(`Fehler beim Ändern von ${this.nameSingle}`, 'Oh oh!', {
        duration: 5000,
        panelClass: [`danger-snackbar`],
        verticalPosition: 'top'
      })
      console.log(err);
      return of(null)
    })).subscribe();
  }

  add() {
    let dialogRef = this.dialog.open(this.formComponent, {
      width: '800px',
      maxHeight: '800px',
      data: {
        entity: {

        }
      },
      disableClose: true
    });
    dialogRef.afterClosed().pipe(concatMap(result => {
      if (result) {
        return this.serviceClass.add(result).pipe(concatMap(data => {
          this._snackBar.open(`${this.nameSingle} wurde angelegt`, 'Super!', {
            duration: 5000,
            panelClass: [`success-snackbar`],
            verticalPosition: 'top'
          })
          return this.updateData();
        }))
      } else return of(null)
    }), catchError(err => {
      if (err.status === 400) {
        this._snackBar.open(`Fehler beim Einfügen: ${err.error.message}`, 'Oh oh!', {
          duration: 5000,
          panelClass: [`danger-snackbar`],
          verticalPosition: 'top'
        })
      } else {
        this._snackBar.open(`Unerwarteter Fehler beim Einfügen`, 'Oh oh!', {
          duration: 5000,
          panelClass: [`danger-snackbar`],
          verticalPosition: 'top'
        })
        console.log(err);
      }
      return of(null)
    })).subscribe();
  }

  delete() {
    if (this.selection.selected.length === 0) return;

    let data: ConfirmDialogModel = {
      title: `${this.name} löschen`,
      message: `Möchten Sie ${this.selection.selected.length} ${this.name} löschen, dies kann nicht rückgängig gemacht werden?`,
      soft: this.softDelete
    }

    let dialogRef = this.dialog.open(ConfirmDialogComponent, {
      maxWidth: "400px",
      data
    });

    dialogRef.afterClosed().pipe(concatMap(dialogResult => {
      if (dialogResult) {
        return this.serviceClass.delete(this.selection.selected.map(e => e.id), dialogResult.soft).pipe(concatMap(data => {
          this._snackBar.open(`${data['affected']} ${this.name} gelöscht`, 'Super!', {
            duration: 5000,
            panelClass: [`success-snackbar`],
            verticalPosition: 'top'
          })
          return this.updateData();
        }))
      } else return of(null)
    }),
      catchError(err => {
        this._snackBar.open(`Fehler beim Löschen der ${this.name}`, 'Oh oh!', {
          duration: 5000,
          panelClass: [`danger-snackbar`],
          verticalPosition: 'top'
        })
        console.log(err);
        return of(null)
      })).subscribe()
  }

  combine() {
    if (this.selection.selected.length < 2) {
      this._snackBar.open(`Bitte selektieren Sie min. zwei ${this.name}`, 'Alles klar!', {
        duration: 5000,
        panelClass: [`warning-snackbar`],
        verticalPosition: 'top'
      })
    } else {
      //selection dialog
      let dialogRef = this.dialog.open(CombineDialogComponent<E>, {
        width: '800px',
        maxHeight: '800px',
        data: {
          ents: this.selection.selected,
          aliases: this.combineAlias
        },
        disableClose: true
      });
      dialogRef.afterClosed().pipe(concatMap(result => {
        if (result) {
          return this.serviceClass.combine(result.id, this.selection.selected.filter(e => e.id !== result.id).map(e => e.id), { aliases: result.aliases, aliases_first_name: result.aliases_first_name, aliases_last_name: result.aliases_last_name }).pipe(concatMap(
            data => {
              this._snackBar.open(`${this.name} wurden zusammengeführt`, 'Super!', {
                duration: 5000,
                panelClass: [`success-snackbar`],
                verticalPosition: 'top'
              })
              return this.updateData();
            }))
        } else return of(null)
      }), catchError(err => {
        this._snackBar.open(`Fehler beim Zusammenführen`, 'Oh oh!', {
          duration: 5000,
          panelClass: [`danger-snackbar`],
          verticalPosition: 'top'
        })
        console.log(err);
        return of(null)
      })).subscribe();
    }
  }

  async showPubs?(id: number, field?: string) {
    let filterkey = null;
    let date_filter;
    if (this.reporting_year) date_filter = [{
      op: JoinOperation.AND,
      key: 'pub_date',
      comp: CompareOperation.GREATER_THAN,
      value: (Number(this.reporting_year) - 1) + '-12-31 23:59:59'
    }, {
      op: JoinOperation.AND,
      key: 'pub_date',
      comp: CompareOperation.SMALLER_THAN,
      value: (Number(this.reporting_year) + 1) + '-01-01 00:00:00'
    }]; else date_filter = [{
      op: JoinOperation.AND,
      key: 'pub_date',
      comp: CompareOperation.EQUALS,
      value: null
    }];

    filterkey = this.filter_key;
    if (field === 'pub_count_corr') filterkey = this.filter_key + '_corr'
    else if (field === 'pub_count_total') {
      date_filter = []
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
    }
    this.store.dispatch(setViewConfig({ viewConfig }))
    this.router.navigateByUrl('publications')
  }

  filterAvailable(col: TableHeader) {
    return (col.type !== 'pubs' && col.type !== 'date' && col.type !== 'datetime')
  }

  /**
   * applies a search filter
   * @param value the filter value (is looked for trimmed and lowercase)
   */
  public doFilter = (value: string) => {
    if (value !== null && value !== undefined) {
      this.dataSource.filter = value.trim().toLocaleLowerCase();
      this.dataSource2.filter = value.trim().toLocaleLowerCase();
    }
  }

  public filter() {
    let filter = new Object();
    this.filterValues.forEach((value, key) => {
      filter[key] = value?.trim().toLocaleLowerCase();
    })
    //this.dataSource.filter = JSON.stringify(filter);
  }

  /**
   * cuts a string for display
   * @param text the original text to display
   * @param max_char the maximum chars to be displayed
   * @param col the column name
   * @returns depending on the column, if the text is longer than the max_char, a truncated string is returned with three dots at the end
   */
  public truncString(text: string, max_char: number, col: TableHeader): string {
    if (!text) return text;
    if (text.length > max_char) return text.substring(0, max_char) + '...';
    else return text;
  }

  public format(text: any) {
    return Number(text).toLocaleString('de-DE');
  }
  public formatEUR(text: any) {
    return Number(text).toLocaleString('de-DE') + ' €';
  }

  public doiHTML(doi: string) {
    if (!doi) return '';
    return `<a class="link-secondary" href="https://dx.doi.org/${doi}" target="_blank">${doi}</a>`;
  }

  public orcidHTML(orcid: string) {
    if (!orcid) return '';
    return `<a class="link-secondary" href="https://orcid.org/${orcid}" target="_blank">${orcid}</a>`;
  }

  public gndHTML(gnd: string) {
    if (!gnd) return '';
    return `<a class="link-secondary" href="https://explore.gnd.network/gnd/${gnd}" target="_blank">${gnd}</a>`;
  }

  sort_state: { key: string, dir: SortDirection }[] = [];

  announceSortChange(sortState: Sort) {
    this.sort_state = this.sort_state.filter(e => e.key !== sortState.active)
    if (sortState?.direction) {
      this.sort_state.push({ key: sortState.active, dir: sortState.direction });

      this.dataSource.data = this.dataSource.data.sort((a, b) => {
        for (let i = 0; i < this.sort_state.length; i++) {
          if (this.sort_state[i].key === 'edit') {
            return (a['locked'] > b['locked'] ? 1 : -1) * (this.sort_state[i].dir === 'asc' ? 1 : -1);
          }
          else {
            let type = this.headers.find(e => e.colName === this.sort_state[i].key)?.type
            let compare = this.compare(type, a[this.sort_state[i].key], b[this.sort_state[i].key], this.sort_state[i].dir);
            if (compare !== 0) return compare;
          }
        }
        return 0;
      })

      this.dataSource.paginator = this.paginator;
    }
  }

  renderHeader(col): { text: string, asc: boolean } {
    let sort = {
      text: '',
      asc: null
    };
    for (let i = 0; i < this.sort_state.length; i++) {
      if (this.sort_state[i].key === col.colName) {
        sort.text = (i + 1) + "";
        if (this.sort_state[i].dir === 'asc') sort.asc = true;
        else sort.asc = false;
        break;
      }
    }
    return sort;
  }

  compare(type: string, a: any, b: any, dir: SortDirection) {
    if (!a && !b) return 0;
    else if (!a && b) return (dir === 'asc' ? -1 : 1)
    else if (a && !b) return (dir === 'asc' ? 1 : -1)
    if ((!type || type === 'string' || type == 'authors') && a) return a.localeCompare(b, 'de-DE') * (dir === 'asc' ? 1 : -1);
    else if (type === 'date' || type === 'datetime') return (Date.parse(a) < Date.parse(b) ? -1 : 1) * (dir === 'asc' ? 1 : -1)
    else return (Number(a) < Number(b) ? -1 : 1) * (dir === 'asc' ? 1 : -1)
  }

  goToPage() {
    let page = null;
    if (this.paginator.length <= this.pageForm.controls.pageNumber.value * this.paginator.pageSize) page = Math.floor(this.paginator.length / this.paginator.pageSize);
    else page = this.pageForm.controls.pageNumber.value; // number of the page you want to jump.
    if (Number.isNaN(page) || !Number.isInteger(Number(page))) {
      this.pageForm.controls.pageNumber.setValue('')
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

  alert(type: string, msg: string, details?: string) {
    let snack;
    if (details) snack = this._snackBar.open(msg, 'Mehr...', {
      duration: 5000,
      panelClass: [`${type}-snackbar`],
      verticalPosition: 'top'
    })
    else snack = this._snackBar.open(msg, 'Schließen', {
      verticalPosition: 'top',
      panelClass: [`${type}-snackbar`]
    })
    if (details) snack.onAction().subscribe({
      next: data => {
        this._snackBar.open(details, 'Schließen', {
          verticalPosition: 'top',
          panelClass: [`${type}-snackbar`]
        });
      }
    })
  }

  formatAuthors(pub) {
    let all_authors = pub.authors_inst?.split('; ')
    let corrs = pub.corr_author?.split('; ')
    if (corrs) for (let corr of corrs) {
      let i = all_authors.indexOf(corr);
      if (i !== -1) all_authors.splice(i, 1)
    }
    if (corrs && corrs.length > 0) {
      if (all_authors && all_authors.length > 0) return `<u>${pub.corr_author}</u>; ${all_authors.join('; ')}`;
      else return `<u>${pub.corr_author}</u>`;
    }
    //if (res.length > this.trunc) return res.substring(0, this.trunc) + '...';
    else return pub.authors_inst;
  }

  getViewConfig(): ViewConfig {
    let res: ViewConfig = {
      sortState: this.sort_state,
      page: this.paginator.pageIndex,
      pageSize: this.paginator.pageSize,
      filterValue: this.searchControl.value,
      filterColumn: this.filterValues
    }
    return res;
  }

  setViewConfig(viewConfig: ViewConfig) {
    this.paginator.pageIndex = viewConfig.page !== null && viewConfig.page !== undefined ? viewConfig.page : this.paginator.pageIndex;
    this.paginator.pageSize = viewConfig.pageSize ? viewConfig.pageSize : this.paginator.pageSize
    this.paginator.page.next({
      pageIndex: this.paginator.pageIndex,
      pageSize: this.paginator.pageSize,
      length: this.dataSource.data.length
    });

    this.paginator2.pageIndex = viewConfig.page ? viewConfig.page : this.paginator2.pageIndex;
    this.paginator2.pageSize = viewConfig.pageSize ? viewConfig.pageSize : this.paginator2.pageSize
    this.paginator2.page.next({
      pageIndex: this.paginator2.pageIndex,
      pageSize: this.paginator2.pageSize,
      length: this.dataSource2?.data.length
    });
    let searchValue = viewConfig.filterValue ? viewConfig.filterValue : '';
    if (searchValue) this.columnFilter = false;
    else this.columnFilter = true;
    this.searchControl.setValue(searchValue);
    this.filterValues = viewConfig.filterColumn;
    if (this.filterValues.get) for (let col of this.headerNames) {
      if (this.filterValues.get(col)) this.filterControls[col].setValue(this.filterValues.get(col))
      else this.filterControls[col].setValue('');
    }
    this.sort_state = viewConfig.sortState;

  }

  isButtonDisabled(e: TableButton) {
    return e.roles && !this.hasRole(e.roles);
  }
  hasRole(roles: string[]) {
    return roles.some(r => this.tokenService.hasRole(r))
  }

  public handlePage(event: PageEvent) {
    this.paginator.pageIndex = event.pageIndex;
    this.paginator2.pageIndex = event.pageIndex;
    
    this.paginator.pageSize = event.pageSize;
    this.paginator2.pageSize = event.pageSize;

    // Aktualisiere die Datenquelle
    this.dataSource.paginator = this.paginator;
    this.dataSource._updateChangeSubscription();
  }

}