import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { concatMap, of, Subject } from 'rxjs';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { CostCenterService } from 'src/app/services/entities/cost-center.service';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { selectReportingYear } from 'src/app/services/redux';
import { TableComponent } from 'src/app/tools/table/table.component';
import { CostCenter } from '../../../../../../output-interfaces/Publication';
import { CostCenterIndex } from '../../../../../../output-interfaces/PublicationIndex';
import { CostCenterFormComponent } from '../../windows/cost-center-form/cost-center-form.component';

@Component({
  selector: 'app-cost-center',
  templateUrl: './cost-center.component.html',
  styleUrls: ['./cost-center.component.css']
})
export class CostCenterComponent implements TableParent<CostCenterIndex>, OnInit {
  buttons: TableButton[] = [
  ];
  loading: boolean = true;
  destroy$ = new Subject();

  formComponent = CostCenterFormComponent;

  cost_centers: CostCenterIndex[] = [];

  @ViewChild(TableComponent) table: TableComponent<CostCenter, CostCenter>;
  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'number', colTitle: 'Nummer' },
    { colName: 'label', colTitle: 'Bezeichnung' },
    { colName: 'pub_count', colTitle: 'Anzahl Publikationen', type: 'pubs' }
  ];
  reporting_year: number;

  constructor(public ccService: CostCenterService, private dialog: MatDialog, private _snackBar: MatSnackBar, private store: Store,
    private publicationService: PublicationService, private router: Router
  ) { }

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
      return this.ccService.index(data);
    })).subscribe({
      next: data => {
        this.cost_centers = data;
        this.loading = false;
        this.table?.update(this.cost_centers)
      }, error: err => this._snackBar.open(`Backend nicht erreichbar`, 'Oh oh!', {
        panelClass: [`danger-snackbar`],
        verticalPosition: 'top'
      })
    })
  }

  getName() {
    return 'Kostenstellen';
  }

  getLink() {
    return '/master-data/cost_centers'
  }

  getLabel() {
    return '/Stammdaten/Kostenstellen'
  }
}
