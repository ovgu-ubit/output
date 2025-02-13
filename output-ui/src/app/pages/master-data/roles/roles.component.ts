import { Component, OnInit } from '@angular/core';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { RoleService } from 'src/app/services/entities/role.service';
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

  formComponent = RoleFormComponent;

  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'label', colTitle: 'Bezeichnung' }
  ];

  constructor(public roleService: RoleService) { }

  ngOnInit(): void {
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
