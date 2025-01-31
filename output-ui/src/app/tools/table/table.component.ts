import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Location } from '@angular/common';
import { MatPaginator, MatPaginatorIntl } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort, Sort, SortDirection } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Alert } from 'src/app/interfaces/alert';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { resetViewConfig, selectReportingYear, setViewConfig, ViewConfig } from 'src/app/services/redux';
import { CompareOperation, JoinOperation, SearchFilter } from '../../../../../output-interfaces/Config';
import { EntityFormComponent, EntityService } from 'src/app/interfaces/service';
import { MatDialog } from '@angular/material/dialog';
import { Entity } from '../../../../../output-interfaces/Publication';
import { ComponentType } from '@angular/cdk/portal';
import { ConfirmDialogComponent, ConfirmDialogModel } from '../confirm-dialog/confirm-dialog.component';
import { SelectionModel } from '@angular/cdk/collections';
import { CombineDialogComponent } from '../combine-dialog/combine-dialog.component';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, combineLatestWith, concat, concatMap, concatWith, map, merge, mergeWith, Observable, of, Subject, take, takeUntil } from 'rxjs';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { Store } from '@ngrx/store';

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
export class TableComponent<T extends Entity, E extends Entity> implements OnInit, OnDestroy {

  @Input() data: Array<T>;
  @Input() wide?: boolean;
  @Input() headers: TableHeader[];
  @Input() id_col: number;
  @Input() name: string;
  @Input() nameSingle: string;
  @Input() icon?: string;

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

  filterValue: string;
  pageForm: UntypedFormGroup;

  trunc: number = 60;
  headerNames = [];
  dataSource: MatTableDataSource<T>;
  dataSource2: MatTableDataSource<T>;
  alerts: Alert[] = [];

  destroy$ = new Subject();

  id;
  public indexOptions: any;

  columnFilter: string = null;
  defaultFilterPredicate?: (data: any, filter: string) => boolean;

  constructor(private formBuilder: UntypedFormBuilder, private _snackBar: MatSnackBar, private dialog: MatDialog,
    public tokenService: AuthorizationService, private location: Location, private router: Router, private route: ActivatedRoute,
    private publicationService: PublicationService, private store: Store) {  }

  public ngOnInit(): void {
    this.loading = true;
    let ob$: Observable<any> = this.parent.preProcessing ? this.parent.preProcessing() : of(null);

    ob$ = ob$.pipe(concatMap(data => {
      return this.store.select(selectReportingYear).pipe(concatMap(data => {
        if (data) {
          return of(data)
        } else {
          return this.publicationService.getDefaultReportingYear();
        }
      }), map(data => {
        this.reporting_year = data;
        if (this.name.includes('Publikationen des Jahres ')) this.name = 'Publikationen des Jahres ' + this.reporting_year;
        let col = this.headers.find(e => e.colName === 'pub_count');
        if (col) col.colTitle += ' ' + data
        col = this.headers.find(e => e.colName === 'pub_count_corr')
        if (col) col.colTitle += ' ' + data
      }), concatMap(data => this.updateData()))
    }));
    
    ob$ = merge(ob$, this.route.queryParamMap.pipe(map(params => {
      if (params.get('id')) {
        this.id = params.get('id');
      }
    })))

    this.dataSource = new MatTableDataSource<T>(this.data);
    //populate the headerNames field for template access
    this.headerNames = this.headers.map(x => x.colName);
    //adding the meta columns at the beginning
    this.headerNames.unshift('edit');
    this.headerNames.unshift('select');
    this.pageForm = this.formBuilder.group({
      pageNumber: ['', [Validators.required, Validators.pattern("^[0-9]*$")]]
    });

    this.defaultFilterPredicate = this.dataSource.filterPredicate;

    ob$.pipe(catchError(err => {
      this._snackBar.open(`Backend nicht erreichbar`, 'Oh oh!', {
        panelClass: [`danger-snackbar`],
        verticalPosition: 'top'
      })
      console.log(err)
      return of(null)
    }), takeUntil(this.destroy$)).subscribe();
    window.onbeforeunload = () => this.ngOnDestroy();
  }

  ngOnDestroy(): void {
    this.destroy$.next('');
  }

  /**
   * updates the view with new data
   * @param data the data to be displayed
   */
  public update(data): void {
    if (this.parent.indexOptions?.filter || this.parent.indexOptions?.paths) this.name = 'Gefilterte Publikationen';
    this.data = data;
    this.dataSource = new MatTableDataSource<T>(data);
    this.dataSource2 = new MatTableDataSource<T>(data);
    //populate the headerNames field for template access
    this.headerNames = this.headers.map(x => x.colName);
    //adding the meta columns at the beginning
    this.headerNames.unshift('edit');
    this.headerNames.unshift('select');
    this.selection.clear();
    this.dataSource.paginator = this.paginator;
    this.dataSource2.paginator = this.paginator2;
    this.dataSource.sort = this.sort;
    this.announceSortChange(this.sort);
    this.filterColumn();
    if (this.id) {
      this.edit({ id: this.id });
    }
  }

  public updateData() {
    return this.serviceClass.index(this.reporting_year, this.parent.indexOptions).pipe(map(data => {
      this.loading = false;
      this.update(data);
    }))
  }

  edit(row: any) {
    this.location.replaceState(this.router.url.split('?')[0], 'id=' + row.id)
    // define Entity Form dialog by id to enforce edit mode
    let dialogRef = this.dialog.open(this.formComponent, {
      width: '800px',
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
    let date_filter = [{
      op: JoinOperation.AND,
      key: 'pub_date',
      comp: CompareOperation.GREATER_THAN,
      value: (Number(this.reporting_year) - 1) + '-12-31 23:59:59'
    }, {
      op: JoinOperation.AND,
      key: 'pub_date',
      comp: CompareOperation.SMALLER_THAN,
      value: (Number(this.reporting_year) + 1) + '-01-01 00:00:00'
    }]

    filterkey = this.filter_key;
    if (field === 'pub_count_corr') filterkey = this.filter_key + '_corr'
    else if (field === 'pub_count_total') {
      date_filter = []
    }
    this.store.dispatch(resetViewConfig());
    let viewConfig: ViewConfig = {
      sortDir: 'asc' as SortDirection,
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

  /**
   * applies a search filter
   * @param value the filter value (is looked for trimmed and lowercase)
   */
  public doFilter = (value: string) => {
    if (value !== null && value !== undefined) this.dataSource.filter = value.trim().toLocaleLowerCase();
  }

  /**
   * changes the filter to only be applied to the chosen column
   */
  public filterColumn() {
    if (this.columnFilter) {
      this.dataSource.filterPredicate = function (data, filter: string): boolean {
        if (filter.includes("*") || filter.includes("?")) {
          let regex = "^" + filter.replaceAll("*", ".*").replaceAll("?", ".");
          return data[this.columnFilter]?.toString().toLowerCase().match(new RegExp(regex))
        }
        else return data[this.columnFilter]?.toString().toLowerCase().includes(filter);
      }.bind(this);
    } else {
      this.dataSource.filterPredicate = function (data, filter: string): boolean {
        if (filter.includes("*") || filter.includes("?")) {
          let regex = "^" + filter.replaceAll("*", ".*").replaceAll("?", ".");
          for (let key of Object.keys(data)) {
            if (data[key]?.toString().toLowerCase().match(new RegExp(regex))) return true;
          }
          return false;
        }
        else {
          for (let key of Object.keys(data)) {
            if (data[key]?.toString().toLowerCase().includes(filter)) return true;
          }
          return false;
        }
      }.bind(this);
      //this.doFilter(this.filterValue);
    }
  }

  /*
    Selects all rows in the table
  */
  public SelectAll(): void {
    this.data.forEach(element => {
      this.selection.select(element);
    });
  }

  /**
   * Checks wether all rows in table are selected
   * @returns if all elements are selected
   */
  public isAllSelected(): boolean {
    const numSelected = this.selection.selected?.length;
    const numRows = this.data?.length;
    return numSelected === numRows;
  }

  /**
  * toggles the row and all rows selection
  */
  public masterToggle(): void {
    this.isAllSelected() ? this.selection.clear() : this.SelectAll();
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

  announceSortChange(sortState: Sort) {
    if (sortState?.direction) {
      this.dataSource = new MatTableDataSource<T>(this.data.sort((a, b) => {
        let type = this.headers.find(e => e.colName === sortState.active).type
        return this.compare(type, a[sortState.active], b[sortState.active], sortState.direction);
      }))
      this.dataSource.paginator = this.paginator;
    }
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
    if (this.paginator.length <= this.pageForm.controls.pageNumber.value * this.paginator.pageSize) this.paginator.pageIndex = Math.floor(this.paginator.length / this.paginator.pageSize);
    else this.paginator.pageIndex = this.pageForm.controls.pageNumber.value; // number of the page you want to jump.
    this.paginator.page.next({
      pageIndex: this.pageForm.controls.pageNumber.value,
      pageSize: this.paginator.pageSize,
      length: this.paginator.length
    });
    this.pageForm.controls.pageNumber.setValue(this.paginator.pageIndex);
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
    all_authors = all_authors?.filter(e => !corrs || !corrs.includes(e))
    if (corrs && corrs.length > 0) {
      if (all_authors && all_authors.length > 0) return `<u>${pub.corr_author}</u>; ${all_authors.join('; ')}`;
      else return `<u>${pub.corr_author}</u>`;
    }
    //if (res.length > this.trunc) return res.substring(0, this.trunc) + '...';
    else return pub.authors_inst;
  }

  getViewConfig(): ViewConfig {
    let res: ViewConfig = {
      sortColumn: this.sort.active,
      sortDir: this.sort.direction,
      page: this.paginator.pageIndex,
      pageSize: this.paginator.pageSize,
      filterValue: this.filterValue,
      filterColumn: this.columnFilter
    }
    return res;
  }

  setViewConfig(viewConfig: ViewConfig) {
    this.paginator.pageIndex = viewConfig.page ? viewConfig.page : this.paginator.pageIndex;
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
      length: this.dataSource2.data.length
    });

    this.filterValue = viewConfig.filterValue ? viewConfig.filterValue : '';
    this.columnFilter = viewConfig.filterColumn;
    //this.filterColumn();

    this.sort.active = viewConfig.sortColumn ? viewConfig.sortColumn : this.headerNames[this.id_col];
    this.sort.direction = viewConfig.sortDir;
    this.dataSource.sort = this.sort;
    this.sort.sortChange.emit();

    this.update(this.data);
  }

  isButtonDisabled(e: TableButton) {
    return e.roles && !this.hasRole(e.roles);
  }
  hasRole(roles: string[]) {
    return roles.some(r => this.tokenService.hasRole(r))
  }

  public handlePageTop(e: any) {
    let { pageSize } = e;
    this.paginator2.pageSize = pageSize;

    if (!this.paginator.hasNextPage()) {
      this.paginator2.lastPage();
    } else if (!this.paginator.hasPreviousPage()) {
      this.paginator2.firstPage();
    } else {
      if (this.paginator.pageIndex < this.paginator2.pageIndex) {
        this.paginator2.previousPage();
      } else if (this.paginator.pageIndex > this.paginator2.pageIndex) {
        this.paginator2.nextPage();
      }
    }
  }


  public handlePageBottom(e: any) {
    if (!this.paginator2.hasNextPage()) {
      this.paginator.lastPage();
    } else if (!this.paginator2.hasPreviousPage()) {
      this.paginator.firstPage();
    } else {
      if (this.paginator2.pageIndex < this.paginator.pageIndex) {
        this.paginator.previousPage();
      } else if (this.paginator2.pageIndex > this.paginator.pageIndex) {
        this.paginator.nextPage();
      }
    }
  }

}