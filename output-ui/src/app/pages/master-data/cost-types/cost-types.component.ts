import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { CostTypeService } from 'src/app/services/entities/cost-type.service';
import { TableComponent } from 'src/app/tools/table/table.component';
import { CostType } from '../../../../../../output-interfaces/Publication';
import { CostTypeFormComponent } from '../../windows/cost-type-form/cost-type-form.component';

@Component({
  selector: 'app-cost-types',
  templateUrl: './cost-types.component.html',
  styleUrls: ['./cost-types.component.css']
})
export class CostTypesComponent implements TableParent<CostType>, OnInit {
  buttons: TableButton[] = [
  ];
  loading: boolean = true;
  destroy$ = new Subject();

  formComponent = CostTypeFormComponent;

  cost_types: CostType[] = [];

  @ViewChild(TableComponent) table: TableComponent<CostType, CostType>;
  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'label', colTitle: 'Bezeichnung' }
  ];
  reporting_year;

  constructor(public ctService: CostTypeService, private dialog: MatDialog, private _snackBar: MatSnackBar) { }

  ngOnInit(): void {
    this.loading = true;
    this.ctService.getAll().subscribe({
      next: data => {
        this.cost_types = data;
        this.loading = false;
        this.table?.update(this.cost_types)
      }, error: err => this._snackBar.open(`Backend nicht erreichbar`, 'Oh oh!', {
        panelClass: [`danger-snackbar`],
        verticalPosition: 'top'
      })
    })
  }

  getName() {
    return 'Kostenarten';
  }

  getLink() {
    return '/master-data/cost_types'
  }

  getLabel() {
    return '/Stammdaten/Kostenarten'
  }
}
