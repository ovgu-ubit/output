import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { OACategoryService } from 'src/app/services/entities/oa-category.service';

@Component({
  selector: 'app-oa-category-form',
  templateUrl: './oa-category-form.component.html',
  styleUrls: ['./oa-category-form.component.css']
})
export class OaCategoryFormComponent implements OnInit {
  name = "Open-Access-Kategorie"
  fields = [
    { key: 'id', title: 'ID', type: 'number' },
    { key: 'label', title: 'Bezeichnung', required: true },
    { key: 'is_oa', title: 'Ist Open-Access?', type: 'boolean' },
  ]

  constructor(public dialogRef: MatDialogRef<OaCategoryFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any, public service: OACategoryService) { }

  ngOnInit(): void {
  }
}



