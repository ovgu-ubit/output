import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PublicationTypeService } from 'src/app/services/entities/publication-type.service';

@Component({
    selector: 'app-pub-type-form',
    templateUrl: './pub-type-form.component.html',
    styleUrls: ['./pub-type-form.component.css'],
    standalone: false
})
export class PubTypeFormComponent implements OnInit {

  name = "Publikationsart"
  fields = [
    { key: 'id', title: 'ID', type: 'number' },
    { key: 'label', title: 'Bezeichnung', required: true, type: 'text'  },
    { key: 'review', title: 'Begutachtet?', type: 'boolean' },
    { key: 'alias', title: 'Aliase', type: 'alias_table' },
  ]

  constructor(public dialogRef: MatDialogRef<PubTypeFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any, public service: PublicationTypeService) { }

  ngOnInit(): void {
  }
}


