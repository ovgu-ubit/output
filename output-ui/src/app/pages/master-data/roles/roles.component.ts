import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { RoleService } from 'src/app/services/entities/role.service';
import { TableComponent } from 'src/app/tools/table/table.component';
import { Role } from '../../../../../../output-interfaces/Publication';
import { RoleFormComponent } from '../../windows/role-form/role-form.component';

@Component({
  selector: 'app-roles',
  templateUrl: './roles.component.html',
  styleUrls: ['./roles.component.css']
})
export class RolesComponent implements TableParent<Role>, OnInit {
  buttons: TableButton[] = [
  ];
  loading: boolean = false;
  destroy$ = new Subject();

  formComponent = RoleFormComponent;

  roles: Role[] = [];

  @ViewChild(TableComponent) table: TableComponent<Role, Role>;
  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'label', colTitle: 'Bezeichnung' }
  ];
  reporting_year;

  constructor(public roleService: RoleService, private dialog: MatDialog, private _snackBar: MatSnackBar) { }

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
