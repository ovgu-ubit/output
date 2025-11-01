import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FunderService } from 'src/app/services/entities/funder.service';

@Component({
    selector: 'app-funder-form',
    templateUrl: './funder-form.component.html',
    styleUrls: ['./funder-form.component.css'],
    standalone: false
})
export class FunderFormComponent implements OnInit {

  name = "Förderer"
  fields = [
    { key: 'id', title: 'ID', type: 'number' },
    { key: 'label', title: 'Bezeichnung', required: true },
    { key: 'doi', title: 'DOI' },
    { key: 'ror_id', title: 'ROR-ID' },
    { key: 'alias', title: 'Aliase', type: 'alias_table' },
  ]

  constructor(public dialogRef: MatDialogRef<FunderFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any, public service: FunderService) { }

  ngOnInit(): void {
  }
}
