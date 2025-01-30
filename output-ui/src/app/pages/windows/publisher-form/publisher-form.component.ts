import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PublisherService } from 'src/app/services/entities/publisher.service';

@Component({
  selector: 'app-publisher-form',
  templateUrl: './publisher-form.component.html',
  styleUrls: ['./publisher-form.component.css']
})
export class PublisherFormComponent implements OnInit{

  name = "Verlag"
  fields = [
    { key: 'id', title: 'ID', type: 'number' },
    { key: 'label', title: 'Bezeichnung', required: true },
    { key: 'alias', title: 'Aliase', type: 'alias_table' },
    { key: 'prefix', title: 'DOI-Präfixe', type: 'doi_table' },
  ]

  constructor(public dialogRef: MatDialogRef<PublisherFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any, public service:PublisherService) {}

  ngOnInit(): void {
  }
}

