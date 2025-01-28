import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject, concatMap, of } from 'rxjs';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { AuthorService } from 'src/app/services/entities/author.service';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { selectReportingYear } from 'src/app/services/redux';
import { TableComponent } from 'src/app/tools/table/table.component';
import { Author } from '../../../../../output-interfaces/Publication';
import { AuthorIndex } from '../../../../../output-interfaces/PublicationIndex';
import { AuthorFormComponent } from '../windows/author-form/author-form.component';

@Component({
  selector: 'app-authors',
  templateUrl: './authors.component.html',
  styleUrls: ['./authors.component.css']
})
export class AuthorsComponent implements TableParent<AuthorIndex>, OnInit {
  buttons: TableButton[] = [
  ];
  loading: boolean;
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
}
