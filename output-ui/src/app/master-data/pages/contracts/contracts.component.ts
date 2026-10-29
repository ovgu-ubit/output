import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { TableButton, TableHeader, TableParent } from 'src/app/table/table.interface';
import { ContractService } from 'src/app/services/entities/contract.service';
import {  ContractIndex  } from '@output/interfaces';
import { ContractFormComponent } from '../../../form/contract-form/contract-form.component';

@Component({
    selector: 'app-contracts',
    templateUrl: './contracts.component.html',
    styleUrls: ['./contracts.component.css'],
    changeDetection: ChangeDetectionStrategy.Eager,
    standalone: false
})
export class ContractsComponent implements TableParent<ContractIndex>, OnInit {
  buttons: TableButton[] = [
  ];

  formComponent = ContractFormComponent;

  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'label', colTitle: 'Bezeichnung' },
    { colName: 'publisher', colTitle: 'Verlag' },
    { colName: 'start_date', colTitle: 'Seit', type: 'date' },
    { colName: 'end_date', colTitle: 'Bis', type: 'date' },
    { colName: 'invoice_amount', colTitle: 'Rechnungsbetrag', type: 'euro' },
    { colName: 'pub_count', colTitle: 'Anzahl Publikationen', type: 'pubs' },
    { colName: 'net_costs', colTitle: 'Kosten (brutto)', type: 'euro' },
    { colName: 'pub_count_total', colTitle: 'Anzahl Publikationen insg.', type: 'pubs' },
    { colName: 'invoice_count', colTitle: 'Anzahl Rechnungen (Rechnungsdatum)', type: 'invoices', roles: ['reader', 'writer', 'admin'] },
    { colName: 'invoice_count_total', colTitle: 'Anzahl Rechnungen insg.', type: 'invoices', roles: ['reader', 'writer', 'admin'] },
  ];

  constructor(public contractService: ContractService) { }

  ngOnInit(): void {
  }

  getName() {
    return 'Verträge';
  }

  getLink() {
    return '/master-data/contracts'
  }

  getLabel() {
    return '/Stammdaten/Verträge'
  }
}
