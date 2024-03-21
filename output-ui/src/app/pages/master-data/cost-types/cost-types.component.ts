import { Component, OnInit, AfterViewInit,ViewChild } from '@angular/core';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { CostType } from '../../../../../../output-interfaces/Publication';
import { Subject } from 'rxjs';
import { SelectionModel } from '@angular/cdk/collections';
import { TableComponent } from 'src/app/tools/table/table.component';
import { CostTypeService } from 'src/app/services/entities/cost-type.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CostTypeFormComponent } from '../../windows/cost-type-form/cost-type-form.component';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-cost-types',
  templateUrl: './cost-types.component.html',
  styleUrls: ['./cost-types.component.css']
})
export class CostTypesComponent  implements TableParent<CostType>, OnInit{
  buttons: TableButton[] = [
    { title: 'Hinzufügen', action_function: this.add.bind(this), roles: ['writer','admin']  },
    { title: 'Löschen', action_function: this.deleteSelected.bind(this), roles: ['writer','admin']  },
  ];
  loading: boolean = true;
  selection: SelectionModel<CostType> = new SelectionModel<CostType>(true, []);
  destroy$ = new Subject();

  cost_types:CostType[] = [];

  @ViewChild(TableComponent) table: TableComponent<CostType>;
  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'label', colTitle: 'Bezeichnung' }
  ];
  reporting_year;

  constructor(private ctService:CostTypeService, private dialog:MatDialog, private _snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loading = true;
    this.ctService.getCostTypes().subscribe({
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
  
  update(): void {
    this.loading = true;
    this.ctService.getCostTypes().subscribe({
      next: data => {
        this.cost_types = data;
        this.loading = false;
        this.table?.update(this.cost_types)
      }
    })
  }

  edit(row: any): void {
    let dialogRef = this.dialog.open(CostTypeFormComponent, {
      width: '800px',
      maxHeight: '800px',
      data: {
        cost_type: row
      },
      disableClose: true
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.label) {
        this.ctService.updateCostType(result).subscribe({
          next: data => {
            this._snackBar.open(`Kostenart geändert`, 'Super!', {
              duration: 5000,
              panelClass: [`success-snackbar`],
              verticalPosition: 'top'
            })
            this.update();
          }, error: err => {
            this._snackBar.open(`Fehler beim Ändern der Kostenart`, 'Oh oh!', {
              duration: 5000,
              panelClass: [`danger-snackbar`],
              verticalPosition: 'top'
            })
            console.log(err);
          }
        })
      }else if (result && result.id) {
        this.ctService.updateCostType(result).subscribe();
      }
    });
  }

  add() {
    let dialogRef = this.dialog.open(CostTypeFormComponent, {
      width: '800px',
      maxHeight: '800px',
      data: {
        
      },
      disableClose: true
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.ctService.updateCostType(result).subscribe({
          next: data => {
            this._snackBar.open(`Kostenart hinzugefügt`, 'Super!', {
              duration: 5000,
              panelClass: [`success-snackbar`],
              verticalPosition: 'top'
            })
            this.update();
          }, error: err => {
            this._snackBar.open(`Fehler beim Hinzufügen der Kostenart`, 'Oh oh!', {
              duration: 5000,
              panelClass: [`danger-snackbar`],
              verticalPosition: 'top'
            })
            console.log(err);
          }
        })
      }

    });
  }
  deleteSelected() {
    //TODO: soft delete option
    if (this.selection.selected.length === 0) return;
    let dialogData = new ConfirmDialogModel(this.selection.selected.length + " Kostenarten löschen", `Möchten Sie ${this.selection.selected.length} Kostenarten löschen, dies kann nicht rückgängig gemacht werden?`);

    let dialogRef = this.dialog.open(ConfirmDialogComponent, {
      maxWidth: "400px",
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(dialogResult => {
      if (dialogResult) {
        this.ctService.deleteCostType(this.selection.selected).subscribe({
          next: data => {
            this._snackBar.open(`${data['affected']} Kostenarten gelöscht`, 'Super!', {
              duration: 5000,
              panelClass: [`success-snackbar`],
              verticalPosition: 'top'
            })
            this.update();
          }, error: err => {
            this._snackBar.open(`Fehler beim Löschen der Kostenarten`, 'Oh oh!', {
              duration: 5000,
              panelClass: [`danger-snackbar`],
              verticalPosition: 'top'
            })
            console.log(err);
          }
        })
      }
    });
  }
}
