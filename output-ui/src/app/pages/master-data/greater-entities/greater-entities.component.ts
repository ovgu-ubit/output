import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject, concatMap, of } from 'rxjs';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { GreaterEntityService } from 'src/app/services/entities/greater-entity.service';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { selectReportingYear } from 'src/app/services/redux';
import { TableComponent } from 'src/app/tools/table/table.component';
import { GreaterEntity } from '../../../../../../output-interfaces/Publication';
import { GreaterEntityIndex } from '../../../../../../output-interfaces/PublicationIndex';
import { GreaterEntityFormComponent } from '../../windows/greater-entity-form/greater-entity-form.component';

@Component({
  selector: 'app-greater-entities',
  templateUrl: './greater-entities.component.html',
  styleUrls: ['./greater-entities.component.css']
})
export class GreaterEntitiesComponent implements TableParent<GreaterEntityIndex>, OnInit {
  buttons: TableButton[] = [
  ];
  loading: boolean = true;
  destroy$ = new Subject();

  formComponent = GreaterEntityFormComponent;

  ges: GreaterEntityIndex[] = [];

  @ViewChild(TableComponent) table: TableComponent<GreaterEntityIndex, GreaterEntity>;
  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'label', colTitle: 'Bezeichnung' },
    { colName: 'rating', colTitle: 'Bemerkung' },
    { colName: 'identifiers', colTitle: 'Identifikatoren' },
    { colName: 'doaj_since', colTitle: 'Im DOAJ seit', type: 'date' },
    { colName: 'doaj_until', colTitle: 'Im DOAJ bis', type: 'date' },
    { colName: 'pub_count', colTitle: 'Anzahl Publikationen', type: 'pubs' },
  ];
  reporting_year;

  constructor(public geService: GreaterEntityService, private dialog: MatDialog, private _snackBar: MatSnackBar, private publicationService: PublicationService,
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
      return this.geService.index(data);
    })).subscribe({
      next: data => {
        this.ges = data;
        this.loading = false;
        this.table?.update(this.ges);
      }, error: err => this._snackBar.open(`Backend nicht erreichbar`, 'Oh oh!', {
        panelClass: [`danger-snackbar`],
        verticalPosition: 'top'
      })
    })
  }

  getName() {
    return 'Größere Einheiten';
  }

  getLink() {
    return '/master-data/greater-entities'
  }

  getLabel() {
    return '/Stammdaten/Größere Einheiten'
  }
}

