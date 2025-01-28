import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject, concatMap, of } from 'rxjs';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { InstituteService } from 'src/app/services/entities/institute.service';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { selectReportingYear } from 'src/app/services/redux';
import { TableComponent } from 'src/app/tools/table/table.component';
import { Institute } from '../../../../../../output-interfaces/Publication';
import { InstituteIndex } from '../../../../../../output-interfaces/PublicationIndex';
import { InstituteFormComponent } from '../../windows/institute-form/institute-form.component';

@Component({
  selector: 'app-institutions',
  templateUrl: './institutions.component.html',
  styleUrls: ['./institutions.component.css']
})
export class InstitutionsComponent implements TableParent<Institute>, OnInit {
  buttons: TableButton[] = [
  ];
  loading: boolean = true;
  destroy$ = new Subject();

  institutes: InstituteIndex[] = [];

  formComponent = InstituteFormComponent;

  reporting_year;

  @ViewChild(TableComponent) table: TableComponent<InstituteIndex, Institute>;
  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'label', colTitle: 'Bezeichnung' },
    { colName: 'short_label', colTitle: 'Kurzbezeichnung' },
    { colName: 'sub_inst_count', colTitle: 'Untergeordnete Institute gesamt', type: 'number' },
    { colName: 'author_count', colTitle: 'Anzahl Autoren', type: 'number' },
    { colName: 'author_count_total', colTitle: 'Anzahl Autoren gesamt', type: 'number' },
    { colName: 'pub_count', colTitle: 'Anzahl Publikationen', type: 'pubs' },
    { colName: 'pub_corr_count', colTitle: 'Anzahl Publikationen (corr.)', type: 'pubs' },
  ];

  constructor(public instService: InstituteService, private dialog: MatDialog, private _snackBar: MatSnackBar, private publicationService: PublicationService,
    private store: Store, private router: Router) { }

  ngOnInit(): void {
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
      return this.instService.index(data);
    })).subscribe({
      next: data => {
        this.institutes = data;
        this.loading = false;
        this.table?.update(this.institutes);
      }, error: err => this._snackBar.open(`Backend nicht erreichbar`, 'Oh oh!', {
        panelClass: [`danger-snackbar`],
        verticalPosition: 'top'
      })
    })
  }

  getName() {
    return 'Institute';
  }

  getLink() {
    return '/master-data/institutions'
  }

  getLabel() {
    return '/Stammdaten/Institute'
  }
}
