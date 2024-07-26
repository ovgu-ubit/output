import { Component, OnInit, Inject, AfterViewInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { CostItem } from '../../../../../../output-api/src/entity/CostItem';
import { CostType } from '../../../../../../output-interfaces/Publication';
import { CostTypeService } from 'src/app/services/entities/cost-type.service';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { MatSelect } from '@angular/material/select';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-cost-item-form',
  templateUrl: './cost-item-form.component.html',
  styleUrls: ['./cost-item-form.component.css']
})
export class CostItemFormComponent implements OnInit, AfterViewInit {

  public form: FormGroup;

  cost_item: CostItem;

  costTypes: CostType[];
  cost_type: number;
  @ViewChild(MatSelect) select;

  constructor(public dialogRef: MatDialogRef<CostItemFormComponent>,private tokenService:AuthorizationService,
    @Inject(MAT_DIALOG_DATA) public data: any, private formBuilder: FormBuilder, private ctService: CostTypeService,
    private dialog:MatDialog) { }

    ngAfterViewInit(): void {
      if (!this.tokenService.hasRole('writer') && !this.tokenService.hasRole('admin')) {
        this.disable();
      }
    }

  ngOnInit(): void {
    if (this.data.cost_item) {
      this.cost_item = this.data.cost_item;
      this.cost_type = this.data.cost_item.cost_type?.id;
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

  disabled = false;

  disable() {
    this.disabled = true;
    this.form.disable();
    this.select.disabled = true;
  }

  action() {
    this.cost_item = { ...this.cost_item, ...this.form.getRawValue() }
    if (!this.cost_item.id) this.cost_item.id = undefined;
    if (!this.cost_item.label) this.cost_item.label = undefined;
    if (!this.cost_item.cost_type) this.cost_item.cost_type = undefined;
    if (!this.cost_item.euro_value) this.cost_item.euro_value = undefined;
    if (!this.cost_item.orig_value) this.cost_item.orig_value = undefined;
    if (this.form.get('orig_currency').value) this.cost_item.orig_currency = this.form.get('orig_currency').value;
    else this.cost_item.orig_currency = undefined;
    if (!this.cost_item.normal_price) this.cost_item.normal_price = undefined;
    if (!this.cost_item.vat) this.cost_item.vat = undefined;

    if (this.cost_type) this.cost_item.cost_type = this.costTypes.find(e => e.id == this.cost_type)
    this.dialogRef.close(this.cost_item)
  }

  abort() {
    if (this.form.dirty) {
      let dialogData = new ConfirmDialogModel("Ungesicherte Änderungen", `Es gibt ungespeicherte Änderungen, möchten Sie diese zunächst speichern?`);

      let dialogRef = this.dialog.open(ConfirmDialogComponent, {
        maxWidth: "400px",
        data: dialogData
      });

      dialogRef.afterClosed().subscribe(dialogResult => {
        if (dialogResult) { //save
          this.action();
        } else if (this.cost_item.id) this.dialogRef.close({ id: this.cost_item.id, locked_at: null })
        else this.close()
      });
    } else if (this.cost_item.id) this.dialogRef.close({ id: this.cost_item.id, locked_at: null })
    else this.close()
  }

  close() {
    this.dialogRef.close(null)
  }
}
