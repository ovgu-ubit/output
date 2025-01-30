import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { GreaterEntityService } from 'src/app/services/entities/greater-entity.service';

@Component({
  selector: 'app-greater-entity-form',
  templateUrl: './greater-entity-form.component.html',
  styleUrls: ['./greater-entity-form.component.css']
})
export class GreaterEntityFormComponent implements OnInit {

  name = "Größere Einheit"
  fields = [
    { key: 'id', title: 'ID', type: 'number' },
    { key: 'label', title: 'Bezeichnung', required: true },
    { key: 'rating', title: 'Bemerkung' },
    { key: 'doaj_since', title: 'Im DOAJ seit', type: 'date' },
    { key: 'doaj_until', title: 'Im DOAJ bis', type: 'date' },
    { key: 'identifier', title: 'Identifikatoren', type: 'id_table' },
  ]

  constructor(public dialogRef: MatDialogRef<GreaterEntityFormComponent>, public tokenService: AuthorizationService,
    @Inject(MAT_DIALOG_DATA) public data: any, private formBuilder: FormBuilder, public service: GreaterEntityService, private _snackBar: MatSnackBar,
    private dialog: MatDialog) { }

  ngOnInit(): void {
  }
}
