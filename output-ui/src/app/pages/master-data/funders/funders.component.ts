import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject, concatMap, of } from 'rxjs';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { FunderService } from 'src/app/services/entities/funder.service';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { selectReportingYear } from 'src/app/services/redux';
import { TableComponent } from 'src/app/tools/table/table.component';
import { Funder } from '../../../../../../output-interfaces/Publication';
import { FunderIndex } from '../../../../../../output-interfaces/PublicationIndex';
import { FunderFormComponent } from '../../windows/funder-form/funder-form.component';

@Component({
  selector: 'app-funders',
  templateUrl: './funders.component.html',
  styleUrls: ['./funders.component.css']
})
export class FundersComponent implements TableParent<FunderIndex>, OnInit {
  buttons: TableButton[] = [
  ];
  loading: boolean = true;
  destroy$ = new Subject();

  formComponent = FunderFormComponent;

  funders: FunderIndex[] = [];

  @ViewChild(TableComponent) table: TableComponent<FunderIndex, Funder>;
  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'label', colTitle: 'Bezeichnung' },
    { colName: 'doi', colTitle: 'DOI', type: 'doi' },
    { colName: 'ror_id', colTitle: 'ROR ID' },
    { colName: 'pub_count', colTitle: 'Anzahl Publikationen', type: 'pubs' },
  ];
  reporting_year;

  constructor(public funderService: FunderService, private dialog: MatDialog, private _snackBar: MatSnackBar, private publicationService: PublicationService,
    private store: Store, private router: Router) { }

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
      return this.funderService.index(data);
    })).subscribe({
      next: data => {
        this.funders = data;
        this.loading = false;
        this.table?.update(this.funders);
      }, error: err => this._snackBar.open(`Backend nicht erreichbar`, 'Oh oh!', {
        panelClass: [`danger-snackbar`],
        verticalPosition: 'top'
      })
    })
  }

  getName() {
    return 'Förderer';
  }

  getLink() {
    return '/master-data/funders'
  }

  getLabel() {
    return '/Stammdaten/Förderer'
  }
}
