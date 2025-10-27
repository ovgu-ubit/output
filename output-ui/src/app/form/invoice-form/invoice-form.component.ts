import { AfterViewInit, Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { CostCenterService } from 'src/app/services/entities/cost-center.service';
import { CostItem, Invoice } from '../../../../../output-interfaces/Publication';
import { AbstractFormComponent } from '../abstract-form/abstract-form.component';
import { CostCenterFormComponent } from '../cost-center-form/cost-center-form.component';
import { CostItemFormComponent } from '../cost-item-form/cost-item-form.component';

@Component({
    selector: 'app-invoice-form',
    templateUrl: './invoice-form.component.html',
    styleUrls: ['./invoice-form.component.css'],
    standalone: false
})
export class InvoiceFormComponent extends AbstractFormComponent<Invoice> implements OnInit, AfterViewInit {

  displayedColumns: string[] = ['label', 'cost_type', 'euro_value', 'vat', 'edit', 'delete'];
  @ViewChild(MatTable) table: MatTable<CostItem>;

  ccForm = CostCenterFormComponent;

  override fields = [
    { key: 'id', title: 'ID', type: 'number' },
    { key: 'number', title: 'Rechnungsnummer' },
    { key: 'date', title: 'Rechnungsdatum', type: 'date' },
    { key: 'booking_date', title: 'Buchungsdatum', type: 'date' },
    { key: 'booking_amount', title: 'Buchungsbetrag in EUR', type: 'number' },
  ]

  constructor(public override dialogRef: MatDialogRef<InvoiceFormComponent>,
    @Inject(MAT_DIALOG_DATA) public override data: any, public ccService: CostCenterService) { super() }

  override ngOnInit(): void {
    this.form = this.formBuilder.group({
      id: [''],
      number: [''],
      date: [''],
      booking_date: [''],
      booking_amount: [''],
    });
  }

  deleteCI(elem) {
    this.entity.cost_items = this.entity.cost_items.filter(e => e.id !== elem.id)
  }
  addCI(cost_item?: CostItem) {
    if (!this.entity.cost_items) this.entity.cost_items = [];
    let idx = -1;
    if (cost_item) idx = this.entity.cost_items.indexOf(cost_item);
    let dialogRef = this.dialog.open(CostItemFormComponent, {
      width: "750px",
      data: {
        entity: cost_item
      },
      disableClose: true
    });
    dialogRef.afterClosed().subscribe({
      next: data => {
        if (data && data.updated) {
          if (idx > -1) this.entity.cost_items[idx] = data;
          else this.entity.cost_items.push(data)
          if (this.table) this.table.dataSource = new MatTableDataSource<Invoice>(this.entity.cost_items);
        }
      }
    });
  }

  setCostCenter(event) {
    this.entity.cost_center = event;
  }
}




