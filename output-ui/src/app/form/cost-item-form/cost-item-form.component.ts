import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CostItem } from '../../../../../output-interfaces/Publication';

@Component({
    selector: 'app-cost-item-form',
    templateUrl: './cost-item-form.component.html',
    styleUrls: ['./cost-item-form.component.css'],
    standalone: false
})
export class CostItemFormComponent {

  name = "Rechnungsposten"
  fields = [
    { key: 'id', title: 'ID', type: 'number' },
    { key: 'label', title: 'Bezeichnung' },
    { key: 'cost_type', title: 'Kostenart', type: 'cost_type' },
    { key: 'euro_value', title: 'Nettobetrag in EUR', type: 'number' },
    { key: 'vat', title: 'Mehrwertsteuer in EUR', type: 'number' },
    { key: 'normal_price', title: 'Normaler Nettopreis', type: 'number' },
    { key: 'orig_value', title: 'Nettobetrag in Originalwährung', type: 'number' },
    { key: 'orig_currency', title: 'Originalwährung', type: 'select', select: ['USD', 'GBP', 'CHF'] },
  ]

  entity: CostItem;

  constructor(public dialogRef: MatDialogRef<CostItemFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) { }

}
