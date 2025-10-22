import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CostTypeService } from 'src/app/services/entities/cost-type.service';

@Component({
  selector: 'app-cost-type-form',
  templateUrl: './cost-type-form.component.html',
  styleUrls: ['./cost-type-form.component.css']
})
export class CostTypeFormComponent implements OnInit {
  name = "Kostenart"
  fields = [
    { key: 'id', title: 'ID', type: 'number' },
    { key: 'label', title: 'Bezeichnung', required: true },
  ]

  constructor(public dialogRef: MatDialogRef<CostTypeFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any, public service: CostTypeService) { }

  ngOnInit(): void {
  }

}
