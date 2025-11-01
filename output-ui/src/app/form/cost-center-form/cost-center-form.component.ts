import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CostCenterService } from 'src/app/services/entities/cost-center.service';

@Component({
    selector: 'app-cost-center-form',
    templateUrl: './cost-center-form.component.html',
    styleUrls: ['./cost-center-form.component.css'],
    standalone: false
})
export class CostCenterFormComponent implements OnInit {

  name = "Kostenstelle"
  fields = [
    { key: 'id', title: 'ID', type: 'number' },
    { key: 'number', title: 'Nummer', required: true },
    { key: 'label', title: 'Bezeichnung', required: true },
  ]

  constructor(public dialogRef: MatDialogRef<CostCenterFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any, public service: CostCenterService) { }

  ngOnInit(): void {
  }
}
