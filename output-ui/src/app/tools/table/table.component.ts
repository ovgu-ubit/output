import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Component, Inject, Input, OnInit, ViewChild } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatPaginator, MatPaginatorIntl } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort, Sort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Alert } from 'src/app/interfaces/alert';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { ViewConfig } from 'src/app/services/redux';

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
export class TableComponent<T> implements OnInit {

  @Input() data: Array<T>;
  @Input() wide?: boolean;
  @Input() headers: TableHeader[];
  @Input() id_col: number;
  @Input() name: string;
  @Input() icon?: string;

  @Input() parent: TableParent<T>;

  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;
  filterValue: string;
  pageForm: UntypedFormGroup;

  trunc: number = 60;
  headerNames = [];
  dataSource: MatTableDataSource<T>;
  alerts: Alert[] = [];

  columnFilter: string = null;
  defaultFilterPredicate?: (data: any, filter: string) => boolean;

  filteredIDs:number[] = [];

  constructor(private _liveAnnouncer: LiveAnnouncer, private formBuilder: UntypedFormBuilder, private _snackBar: MatSnackBar, 
    public tokenService: AuthorizationService) {
  }

  public ngOnInit(): void {
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
  }

  /**
   * updates the view with new data
   * @param data the data to be displayed
   */
  public update(data): void {
    this.data = data;
    this.dataSource = new MatTableDataSource<T>(data);
    this.parent.selection.clear();
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    this.filterColumn();
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
        return data[this.columnFilter]?.toString().toLowerCase().includes(filter);
      }.bind(this);
    } else this.dataSource.filterPredicate = this.defaultFilterPredicate;
    this.doFilter(this.filterValue);
  }

  /*
    Selects all rows in the table
  */
  public SelectAll(): void {
    this.data.forEach(element => {
      this.parent.selection.select(element);
    });
  }

  /**
   * Checks wether all rows in table are selected
   * @returns if all elements are selected
   */
  public isAllSelected(): boolean {
    const numSelected = this.parent.selection.selected?.length;
    const numRows = this.data?.length;
    return numSelected === numRows;
  }

  /**
  * toggles the row and all rows selection
  */
  public masterToggle(): void {
    this.isAllSelected() ? this.parent.selection.clear() : this.SelectAll();
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
    return Number(text).toLocaleString('de-DE')+' €';
  }

  public doiHTML(doi: string) {
    if (!doi) return '';
    return `<a class="link-secondary" href="https://dx.doi.org/${doi}" target="_blank">${doi}</a>`;
  }

  /** Announce the change in sort state for assistive technology. */
  announceSortChange(sortState: Sort) {
    // This example uses English messages. If your application supports
    // multiple language, you would internationalize these strings.
    // Furthermore, you can customize the message to add additional
    // details about the values being sorted.
    if (sortState?.direction) {
      this._liveAnnouncer.announce(`Sorted ${sortState.direction}ending`);
    } else {
      this._liveAnnouncer.announce('Sorting cleared');
    }
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
      filterColumn: this.columnFilter,
      filteredIDs: this.filteredIDs
    }
    return res;
  }

  setViewConfig(viewConfig: ViewConfig) {
    this.paginator.pageIndex = viewConfig.page? viewConfig.page : this.paginator.pageIndex;
    this.paginator.pageSize = viewConfig.pageSize ? viewConfig.pageSize : this.paginator.pageSize
    this.paginator.page.next({
      pageIndex: this.paginator.pageIndex,
      pageSize: this.paginator.pageSize,
      length: this.dataSource.data.length
    });

    this.filterValue = viewConfig.filterValue? viewConfig.filterValue : '';
    this.columnFilter = viewConfig.filterColumn;
    //this.filterColumn();

    this.sort.active = viewConfig.sortColumn? viewConfig.sortColumn : this.headerNames[this.id_col];
    this.sort.direction = viewConfig.sortDir;
    this.dataSource.sort = this.sort;
    this.sort.sortChange.emit();

    this.filteredIDs = viewConfig.filteredIDs;
    if (this.filteredIDs && this.filteredIDs.length > 0) this.update(this.data.filter(e => this.filteredIDs.includes(e['id'] as number)))
    else this.update(this.data)
  }

  isButtonDisabled(e:TableButton) {
    return e.roles && !e.roles.some(r => this.tokenService.hasRole(r));
  }

}