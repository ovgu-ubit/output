import { SelectionModel } from '@angular/cdk/collections';
import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { StatusService } from 'src/app/services/entities/status.service';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';
import { TableComponent } from 'src/app/tools/table/table.component';
import { Status } from '../../../../../../output-interfaces/Publication';
import { StatusFormComponent } from '../../windows/status-form/status-form.component';

@Component({
  selector: 'app-statuses',
  templateUrl: './statuses.component.html',
  styleUrl: './statuses.component.css'
})
export class StatusesComponent implements TableParent<Status>, OnInit{
  buttons: TableButton[] = [
    { title: 'Hinzufügen', action_function: this.add.bind(this), roles: ['writer','admin']  },
    { title: 'Löschen', action_function: this.deleteSelected.bind(this), roles: ['writer','admin']  },
  ];
  loading: boolean = true;
  selection: SelectionModel<Status> = new SelectionModel<Status>(true, []);
  destroy$ = new Subject();

  statuses:Status[] = [];

  @ViewChild(TableComponent) table: TableComponent<Status>;
  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'Status', type: 'number' },
    { colName: 'label', colTitle: 'Bezeichnung' },
    { colName: 'description', colTitle: 'Beschreibung' }
  ];
  reporting_year;

  constructor(private statusService:StatusService, private dialog:MatDialog, private _snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loading = true;
    this.update();
  }
  
  getName() {
    return 'Status';
  }

  getLink() {
    return '/master-data/status'
  }

  getLabel() {
    return '/Stammdaten/Status'
  }
  
  update(): void {
    this.loading = true;
    this.statusService.getStatuses().subscribe({
      next: data => {
        this.statuses = data;
        this.loading = false;
        this.table?.update(this.statuses)
      }, error: err => this._snackBar.open(`Backend nicht erreichbar`, 'Oh oh!', {
        panelClass: [`danger-snackbar`],
        verticalPosition: 'top'
      })
    })
  }

  edit(row: any): void {
    let dialogRef = this.dialog.open(StatusFormComponent, {
      width: '800px',
      maxHeight: '800px',
      data: {
        status: row
      },
      disableClose: true
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.label) {
        this.statusService.update(result).subscribe({
          next: data => {
            this._snackBar.open(`Status geändert`, 'Super!', {
              duration: 5000,
              panelClass: [`success-snackbar`],
              verticalPosition: 'top'
            })
            this.update();
          }, error: err => {
            this._snackBar.open(`Fehler beim Ändern des Status`, 'Oh oh!', {
              duration: 5000,
              panelClass: [`danger-snackbar`],
              verticalPosition: 'top'
            })
            console.log(err);
          }
        })
      }else if (result && result.id) {
        this.statusService.update(result).subscribe();
      }
    });
  }

  add() {
    let dialogRef = this.dialog.open(StatusFormComponent, {
      width: '800px',
      maxHeight: '800px',
      data: {
        
      },
      disableClose: true
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.statusService.update(result).subscribe({
          next: data => {
            this._snackBar.open(`Status hinzugefügt`, 'Super!', {
              duration: 5000,
              panelClass: [`success-snackbar`],
              verticalPosition: 'top'
            })
            this.update();
          }, error: err => {
            if (err.status === 400) {
              this._snackBar.open(`Fehler beim Einfügen: ${err.error.message}`, 'Oh oh!', {
                duration: 5000,
                panelClass: [`danger-snackbar`],
                verticalPosition: 'top'
              })
            } else {
              this._snackBar.open(`Unerwarteter Fehler beim Einfügen`, 'Oh oh!', {
                duration: 5000,
                panelClass: [`danger-snackbar`],
                verticalPosition: 'top'
              })
              console.log(err);
            }
          }
        })
      }

    });
  }
  deleteSelected() {
    //TODO: soft delete option
    if (this.selection.selected.length === 0) return;
    let dialogData = new ConfirmDialogModel(this.selection.selected.length + " Status löschen", `Möchten Sie ${this.selection.selected.length} Status löschen, dies kann nicht rückgängig gemacht werden?`);

    let dialogRef = this.dialog.open(ConfirmDialogComponent, {
      maxWidth: "400px",
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(dialogResult => {
      if (dialogResult) {
        this.statusService.delete(this.selection.selected).subscribe({
          next: data => {
            this._snackBar.open(`${data['affected']} Status gelöscht`, 'Super!', {
              duration: 5000,
              panelClass: [`success-snackbar`],
              verticalPosition: 'top'
            })
            this.update();
          }, error: err => {
            this._snackBar.open(`Fehler beim Löschen der Status`, 'Oh oh!', {
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

