import { SelectionModel } from '@angular/cdk/collections';
import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { TableComponent } from 'src/app/tools/table/table.component';
import { Subject, concat, concatMap, delay, map, merge, of, takeUntil } from 'rxjs';
import { AuthorService } from 'src/app/services/entities/author.service';
import { Author } from '../../../../../output-interfaces/Publication';
import { AuthorIndex } from '../../../../../output-interfaces/PublicationIndex';
import { AuthorFormComponent } from '../windows/author-form/author-form.component';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CombineDialogComponent } from 'src/app/tools/combine-dialog/combine-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';
import { Store } from '@ngrx/store';
import { ViewConfig, resetViewConfig, selectReportingYear, setViewConfig } from 'src/app/services/redux';
import { SortDirection } from '@angular/material/sort';
import { Router } from '@angular/router';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { CompareOperation, JoinOperation } from '../../../../../output-interfaces/Config';
import { EntityFormComponent } from 'src/app/interfaces/service';
import { ComponentType } from '@angular/cdk/portal';

@Component({
  selector: 'app-authors',
  templateUrl: './authors.component.html',
  styleUrls: ['./authors.component.css']
})
export class AuthorsComponent implements TableParent<AuthorIndex>, OnInit {
  buttons: TableButton[] = [
  ];
  loading: boolean;
  selection: SelectionModel<any> = new SelectionModel<any>(true, []);
  destroy$ = new Subject();

  formComponent = AuthorFormComponent;

  authors: AuthorIndex[] = [];
  reporting_year: number;

  @ViewChild(TableComponent) table: TableComponent<AuthorIndex, Author>;
  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'title', colTitle: 'Titel' },
    { colName: 'first_name', colTitle: 'Vorname' },
    { colName: 'last_name', colTitle: 'Nachname' },
    { colName: 'orcid', colTitle: 'ORCID' },
    { colName: 'gnd_id', colTitle: 'GND-Nr.' },
    { colName: 'institutes', colTitle: 'Institute' },
    { colName: 'pub_count', colTitle: 'Anzahl Publikationen', type: 'pubs' },
    { colName: 'pub_corr_count', colTitle: 'Anzahl Publikationen (corr.)', type: 'pubs' },
    { colName: 'pub_count_total', colTitle: 'Anzahl Publikationen insg.', type: 'pubs' },
  ];

  constructor(public authorService: AuthorService, private dialog: MatDialog, private _snackBar: MatSnackBar, private store: Store, private publicationService: PublicationService,
    private router: Router) { }

  ngOnInit(): void {
    this.loading = true;
    this.store.select(selectReportingYear).pipe(concatMap(data => {
      if (data) {
        return of(data);
      } else {
        return this.publicationService.getDefaultReportingYear();
      }
    }), concatMap(data => {
      this.reporting_year = data;
      this.headers.find(e => e.colName === 'pub_count').colTitle += ' ' + data
      this.headers.find(e => e.colName === 'pub_corr_count').colTitle += ' ' + data
      return this.authorService.index(data);
    })).subscribe({
      next: data => {
        this.authors = data;
        this.loading = false;
        this.table.update(this.authors);
      }, error: err => this._snackBar.open(`Backend nicht erreichbar`, 'Oh oh!', {
        panelClass: [`danger-snackbar`],
        verticalPosition: 'top'
      })
    })
  }

  getName() {
    return 'Personen';
  }

  getLink() {
    return '/authors'
  }

  getLabel() {
    return '/Personen'
  }

  update(): void {
    this.loading = true;
    this.authorService.index(this.reporting_year).subscribe({
      next: data => {
        this.authors = data;
        this.loading = false;
        this.table.update(this.authors);
      }
    })
  }

  async showPubs?(id: number, field?: string) {
    this.store.dispatch(resetViewConfig());
    let viewConfig: ViewConfig;
    if (field === 'pub_count') {
      viewConfig = {
        sortDir: 'asc' as SortDirection,
        filter: {
          filter: {
            expressions: [{
              op: JoinOperation.AND,
              key: 'author_id',
              comp: CompareOperation.EQUALS,
              value: id
            }, {
              op: JoinOperation.AND,
              key: 'pub_date',
              comp: CompareOperation.GREATER_THAN,
              value: (this.reporting_year - 1) + '-12-31 23:59:59'
            }, {
              op: JoinOperation.AND,
              key: 'pub_date',
              comp: CompareOperation.SMALLER_THAN,
              value: (this.reporting_year + 1) + '-01-01 00:00:00'
            }]
          }
        }
      }
    } else if (field === 'pub_count_corr'){
      viewConfig = {
        sortDir: 'asc' as SortDirection,
        filter: {
          filter: {
            expressions: [{
              op: JoinOperation.AND,
              key: 'author_id_corr',
              comp: CompareOperation.EQUALS,
              value: id
            }, {
              op: JoinOperation.AND,
              key: 'pub_date',
              comp: CompareOperation.GREATER_THAN,
              value: (this.reporting_year - 1) + '-12-31 23:59:59'
            }, {
              op: JoinOperation.AND,
              key: 'pub_date',
              comp: CompareOperation.SMALLER_THAN,
              value: (this.reporting_year + 1) + '-01-01 00:00:00'
            }]
          }
        }
      }
    } else if (field === 'pub_count_total') {
      viewConfig = {
        sortDir: 'asc' as SortDirection,
        filter: {
          filter: {
            expressions: [{
              op: JoinOperation.AND,
              key: 'author_id',
              comp: CompareOperation.EQUALS,
              value: id
            }]
          }
        }
      }
    }
    this.store.dispatch(setViewConfig({ viewConfig }))
    this.router.navigateByUrl('publications')
  }
}
