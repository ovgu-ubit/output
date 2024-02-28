import { Component,OnInit,AfterViewInit,ViewChild } from '@angular/core';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { CostCenter } from '../../../../../../output-interfaces/Publication';
import { Subject } from 'rxjs';
import { SelectionModel } from '@angular/cdk/collections';
import { TableComponent } from 'src/app/tools/table/table.component';
import { CostCenterService } from 'src/app/services/entities/cost-center.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CostCenterFormComponent } from '../../windows/cost-center-form/cost-center-form.component';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-cost-center',
  templateUrl: './cost-center.component.html',
  styleUrls: ['./cost-center.component.css']
})
export class CostCenterComponent implements TableParent<CostCenter>, OnInit{
  buttons: TableButton[] = [
    { title: 'Hinzufügen', action_function: this.add.bind(this), roles: ['writer'] },
    { title: 'Löschen', action_function: this.deleteSelected.bind(this), roles: ['writer'] },
  ];
  loading: boolean = true;
  selection: SelectionModel<CostCenter> = new SelectionModel<CostCenter>(true, []);
  destroy$ = new Subject();

  cost_centers:CostCenter[] = [];

  @ViewChild(TableComponent) table: TableComponent<CostCenter>;
  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'number', colTitle: 'Nummer' },
    { colName: 'label', colTitle: 'Bezeichnung' }
  ];
  reporting_year;

  constructor(private ccService:CostCenterService, private dialog:MatDialog, private _snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loading = true;
    this.ccService.getCostCenters().subscribe({
      next: data => {
        this.cost_centers = data;
        this.loading = false;
        this.table?.update(this.cost_centers)
      }
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
  
  update(): void {
    this.loading = true;
    this.ccService.getCostCenters().subscribe({
      next: data => {
        this.cost_centers = data;
        this.loading = false;
        this.table?.update(this.cost_centers)
      }
    })
  }

  edit(row: any): void {
    let dialogRef = this.dialog.open(CostCenterFormComponent, {
      width: '800px',
      maxHeight: '800px',
      data: {
        cost_center: row
      },
      disableClose: true
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.label) {
        this.ccService.updateCostCenter(result).subscribe({
          next: data => {
            this._snackBar.open(`Kostenstelle geändert`, 'Super!', {
              duration: 5000,
              panelClass: [`success-snackbar`],
              verticalPosition: 'top'
            })
            this.update();
          }, error: err => {
            this._snackBar.open(`Fehler beim Ändern der Kostenstelle`, 'Oh oh!', {
              duration: 5000,
              panelClass: [`danger-snackbar`],
              verticalPosition: 'top'
            })
            console.log(err);
          }
        })
      }else if (result && result.id) {
        this.ccService.updateCostCenter(result).subscribe();
      }
    });
  }

  add() {
    let dialogRef = this.dialog.open(CostCenterFormComponent, {
      width: '800px',
      maxHeight: '800px',
      data: {
        
      },
      disableClose: true
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.ccService.updateCostCenter(result).subscribe({
          next: data => {
            this._snackBar.open(`Kostenstelle hinzugefügt`, 'Super!', {
              duration: 5000,
              panelClass: [`success-snackbar`],
              verticalPosition: 'top'
            })
            this.update();
          }, error: err => {
            this._snackBar.open(`Fehler beim Hinzufügen der Kostenstelle`, 'Oh oh!', {
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
    let dialogData = new ConfirmDialogModel(this.selection.selected.length + " Kostenstellen löschen", `Möchten Sie ${this.selection.selected.length} Kostenstellen löschen, dies kann nicht rückgängig gemacht werden?`);

    let dialogRef = this.dialog.open(ConfirmDialogComponent, {
      maxWidth: "400px",
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(dialogResult => {
      if (dialogResult) {
        this.ccService.deleteCostCenter(this.selection.selected).subscribe({
          next: data => {
            this._snackBar.open(`${data['affected']} Kostenstellen gelöscht`, 'Super!', {
              duration: 5000,
              panelClass: [`success-snackbar`],
              verticalPosition: 'top'
            })
            this.update();
          }, error: err => {
            this._snackBar.open(`Fehler beim Löschen der Kostenstellen`, 'Oh oh!', {
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
