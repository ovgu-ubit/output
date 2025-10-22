import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { RoleService } from 'src/app/services/entities/role.service';

@Component({
  selector: 'app-role-form',
  templateUrl: './role-form.component.html',
  styleUrls: ['./role-form.component.css']
})
export class RoleFormComponent implements OnInit {

  name = "Rolle"
  fields = [
    { key: 'id', title: 'ID', type: 'number' },
    { key: 'label', title: 'Bezeichnung', required: true },
  ]

  constructor(public dialogRef: MatDialogRef<RoleFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any, public service: RoleService) { }

  ngOnInit(): void {
  }
}

