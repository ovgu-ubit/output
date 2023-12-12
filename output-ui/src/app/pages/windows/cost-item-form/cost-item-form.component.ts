import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CostItem } from '../../../../../../output-api/src/entity/CostItem';
import { CostType } from '../../../../../../output-interfaces/Publication';
import { InvoiceService } from 'src/app/services/entities/invoice.service';
import { CostTypeService } from 'src/app/services/entities/cost-type.service';

@Component({
  selector: 'app-cost-item-form',
  templateUrl: './cost-item-form.component.html',
  styleUrls: ['./cost-item-form.component.css']
})
export class CostItemFormComponent implements OnInit {

  public form: FormGroup;

  cost_item: CostItem;

  costTypes: CostType[];
  cost_type: number;

  constructor(public dialogRef: MatDialogRef<CostItemFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any, private formBuilder: FormBuilder, private ctService: CostTypeService) { }


  ngOnInit(): void {
    if (this.data.cost_item) {
      this.cost_item = this.data.cost_item;
      this.cost_type = this.data.cost_item.cost_type.id;
    }
    else {
      this.cost_item = {
      };
    }
    this.ctService.getCostTypes().subscribe({
      next: data => {
        this.costTypes = data;
        //this.cost_item.cost_type = this.costTypes.find(e => e.id == this.data.cost_item?.cost_type)
      }
    })
    this.form = this.formBuilder.group({
      id: [''],
      label: [''],
      cost_type: [''],
      euro_value: [''],
      orig_value: [''],
      orig_currency: [''],
      normal_price: [''],
      vat: [''],
    });
    this.form.controls.id.disable();
    this.form.patchValue(this.cost_item)
  }

  action() {
    this.cost_item = { ...this.cost_item, ...this.form.getRawValue() }
    if (!this.cost_item.id) this.cost_item.id = undefined;
    if (!this.cost_item.cost_type) this.cost_item.cost_type = undefined;
    if (!this.cost_item.euro_value) this.cost_item.euro_value = undefined;
    if (!this.cost_item.orig_value) this.cost_item.orig_value = undefined;
    if (!this.cost_item.normal_price) this.cost_item.normal_price = undefined;
    if (!this.cost_item.vat) this.cost_item.vat = undefined;

    if (this.cost_type) this.cost_item.cost_type = this.costTypes.find(e => e.id == this.cost_type)
    this.dialogRef.close(this.cost_item)
  }

  abort() {
    this.dialogRef.close(null)
  }
}
