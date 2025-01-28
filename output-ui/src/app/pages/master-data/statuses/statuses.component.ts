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
  ];
  loading: boolean = true;
  selection: SelectionModel<Status> = new SelectionModel<Status>(true, []);
  destroy$ = new Subject();
        
  formComponent = StatusFormComponent;

  statuses:Status[] = [];

  @ViewChild(TableComponent) table: TableComponent<Status, Status>;
  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'Status', type: 'number' },
    { colName: 'label', colTitle: 'Bezeichnung' },
    { colName: 'description', colTitle: 'Beschreibung' }
  ];
  reporting_year;

  constructor(public statusService:StatusService, private dialog:MatDialog, private _snackBar: MatSnackBar) {}

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
    this.statusService.getAll().subscribe({
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
}

