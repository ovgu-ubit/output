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
  ];
  loading: boolean = false;
  destroy$ = new Subject();
      
  formComponent = RoleFormComponent;

  roles:Role[] = [];

  @ViewChild(TableComponent) table: TableComponent<Role, Role>;
  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'label', colTitle: 'Bezeichnung' }
  ];
  reporting_year;

  constructor(public roleService:RoleService, private dialog:MatDialog, private _snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.loading = true;
    this.roleService.getAll().subscribe(data => {
      this.loading = false;
      this.roles = data;
      this.table.update(data)
    })
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
}
