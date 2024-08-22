import { Component,OnInit,ViewChild } from '@angular/core';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { Role } from '../../../../../../output-interfaces/Publication';
import { SelectionModel } from '@angular/cdk/collections';
import { Subject } from 'rxjs';
import { TableComponent } from 'src/app/tools/table/table.component';
import { RoleService } from 'src/app/services/entities/role.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RoleFormComponent } from '../../windows/role-form/role-form.component';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-roles',
  templateUrl: './roles.component.html',
  styleUrls: ['./roles.component.css']
})
export class RolesComponent  implements TableParent<Role>, OnInit{
  buttons: TableButton[] = [
    { title: 'Hinzufügen', action_function: this.add.bind(this), roles: ['writer','admin']  },
    { title: 'Löschen', action_function: this.deleteSelected.bind(this), roles: ['writer','admin']  },
  ];
  loading: boolean = true;
  selection: SelectionModel<Role> = new SelectionModel<Role>(true, []);
  destroy$ = new Subject();

  roles:Role[] = [];

  @ViewChild(TableComponent) table: TableComponent<Role>;
  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'label', colTitle: 'Bezeichnung' }
  ];
  reporting_year;

  constructor(private roleService:RoleService, private dialog:MatDialog, private _snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loading = true;
    this.update();
  }
  
  getName() {
    return 'Rollen';
  }

  getLink() {
    return '/master-data/roles'
  }

  getLabel() {
    return '/Stammdaten/Rollen'
  }
  
  update(): void {
    this.loading = true;
    this.roleService.getRoles().subscribe({
      next: data => {
        this.roles = data;
        this.loading = false;
        this.table?.update(this.roles)
      }, error: err => this._snackBar.open(`Backend nicht erreichbar`, 'Oh oh!', {
        panelClass: [`danger-snackbar`],
        verticalPosition: 'top'
      })
    })
  }

  edit(row: any): void {
    let dialogRef = this.dialog.open(RoleFormComponent, {
      width: '800px',
      maxHeight: '800px',
      data: {
        role: row
      },
      disableClose: true
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.label) {
        this.roleService.update(result).subscribe({
          next: data => {
            this._snackBar.open(`Rolle geändert`, 'Super!', {
              duration: 5000,
              panelClass: [`success-snackbar`],
              verticalPosition: 'top'
            })
            this.update();
          }, error: err => {
            this._snackBar.open(`Fehler beim Ändern der Rolle`, 'Oh oh!', {
              duration: 5000,
              panelClass: [`danger-snackbar`],
              verticalPosition: 'top'
            })
            console.log(err);
          }
        })
      }else if (result && result.id) {
        this.roleService.update(result).subscribe();
      }
    });
  }

  add() {
    let dialogRef = this.dialog.open(RoleFormComponent, {
      width: '800px',
      maxHeight: '800px',
      data: {
        
      },
      disableClose: true
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.roleService.update(result).subscribe({
          next: data => {
            this._snackBar.open(`Rolle hinzugefügt`, 'Super!', {
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
    let dialogData = new ConfirmDialogModel(this.selection.selected.length + " Rollen löschen", `Möchten Sie ${this.selection.selected.length} Rollen löschen, dies kann nicht rückgängig gemacht werden?`);

    let dialogRef = this.dialog.open(ConfirmDialogComponent, {
      maxWidth: "400px",
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(dialogResult => {
      if (dialogResult) {
        this.roleService.delete(this.selection.selected).subscribe({
          next: data => {
            this._snackBar.open(`${data['affected']} Rollen gelöscht`, 'Super!', {
              duration: 5000,
              panelClass: [`success-snackbar`],
              verticalPosition: 'top'
            })
            this.update();
          }, error: err => {
            this._snackBar.open(`Fehler beim Löschen der Rollen`, 'Oh oh!', {
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
