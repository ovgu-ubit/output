import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
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
    { key: 'label', title: 'Bezeichnung', required: true, type: 'text' },
    { key: 'rating', title: 'Bemerkung', type: 'text' },
    { key: 'doaj_since', title: 'Im DOAJ seit', type: 'date' },
    { key: 'doaj_until', title: 'Im DOAJ bis', type: 'date' },
    { key: 'identifier', title: 'Identifikatoren', type: 'id_table' },
  ]

  constructor(public dialogRef: MatDialogRef<GreaterEntityFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any, public service: GreaterEntityService) { }

  ngOnInit(): void {
  }
}
