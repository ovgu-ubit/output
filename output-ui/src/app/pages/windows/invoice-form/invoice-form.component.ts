import { AfterViewInit, Component, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { CostCenter, CostItem, Invoice } from '../../../../../../output-interfaces/Publication';
import { InvoiceService } from 'src/app/services/entities/invoice.service';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { CostItemFormComponent } from '../cost-item-form/cost-item-form.component';
import { CostCenterService } from 'src/app/services/entities/cost-center.service';
import * as moment from 'moment';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { MatSelect } from '@angular/material/select';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-invoice-form',
  templateUrl: './invoice-form.component.html',
  styleUrls: ['./invoice-form.component.css']
})
export class InvoiceFormComponent implements OnInit, AfterViewInit {

  public form: FormGroup;

  invoice: Invoice;

  cost_center: CostCenter;
  costCenters: CostCenter[];
  today = new Date();
  displayedColumns: string[] = ['label', 'cost_type', 'euro_value', 'vat', 'edit', 'delete'];
  @ViewChild(MatTable) table: MatTable<CostItem>;
  @ViewChild(MatSelect) select;

  constructor(public dialogRef: MatDialogRef<InvoiceFormComponent>,private tokenService:AuthorizationService,
    @Inject(MAT_DIALOG_DATA) public data: any, private formBuilder: FormBuilder, private ccService:CostCenterService, private dialog: MatDialog,
    private invoiceService:InvoiceService) { }

  ngAfterViewInit(): void {
    if (!this.tokenService.hasRole('writer') && !this.tokenService.hasRole('admin')) {
      this.disable();
    }
  }


  ngOnInit(): void {
    if (this.data.invoice) {
      this.invoice = this.data.invoice;
      this.cost_center = this.invoice.cost_center;
    }
    else this.invoice = {
      cost_items: []
    }
    this.ccService.getCostCenters().subscribe({
      next: data => {
        this.costCenters = data;
      }
    })
    this.form = this.formBuilder.group({
      id: [''],
      cost_center: [''],
      number: [''],
      date: [''],
      booking_date: [''],
      booking_amount: [''],
    });
    this.form.controls.id.disable();
    this.form.patchValue(this.invoice)
  }
  disabled = false;

  disable() {
    this.disabled = true;
    this.form.disable();
    this.select.disabled = true;
  }

  action() {
    if (this.form.invalid) return;
    this.invoice = { ...this.invoice, ...this.form.getRawValue() }
    if (!this.invoice.id) this.invoice.id = undefined;
    if (!this.invoice.booking_amount) this.invoice.booking_amount = undefined;
    this.invoice.cost_center = this.cost_center;
    if (!this.form.get('date').value) this.invoice.date = undefined;
    else if (moment.isMoment(this.form.get('date').value)) this.invoice.date = this.form.get('date').value?.format()
    if (!this.form.get('booking_date').value) this.invoice.booking_date = undefined;
    else if (moment.isMoment(this.form.get('booking_date').value)) this.invoice.booking_date = this.form.get('booking_date').value?.format()
    this.dialogRef.close(this.invoice)
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
        } else if (this.invoice.id) this.dialogRef.close({ id: this.invoice.id, locked_at: null })
        else this.close()
      });
    } else if (this.invoice.id) this.dialogRef.close({ id: this.invoice.id, locked_at: null })
    else this.close()
  }

  close() {
    this.dialogRef.close(null)
  }

  deleteCI(elem) {
    this.invoice.cost_items = this.invoice.cost_items.filter(e => e.id !== elem.id)
  }
  addCI(cost_item?:CostItem) {
    let idx = -1;
    if (cost_item) idx = this.invoice.cost_items.indexOf(cost_item);
    let dialogRef = this.dialog.open(CostItemFormComponent, {
      maxWidth: "600px",
      data: {
        cost_item
      }
    });
    dialogRef.afterClosed().subscribe({
      next: data => {
        if (data) {
          if (idx > -1) this.invoice.cost_items[idx] = data;
          else this.invoice.cost_items.push(data)
          if (this.table) this.table.dataSource = new MatTableDataSource<Invoice>(this.invoice.cost_items);
        } 
      }
    });
  }
}




