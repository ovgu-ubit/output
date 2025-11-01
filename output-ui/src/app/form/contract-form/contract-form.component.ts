import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ContractService } from 'src/app/services/entities/contract.service';
import { PublisherService } from 'src/app/services/entities/publisher.service';

@Component({
    selector: 'app-contract-form',
    templateUrl: './contract-form.component.html',
    styleUrls: ['./contract-form.component.css'],
    standalone: false
})
export class ContractFormComponent implements OnInit {

  name = "Vertrag"
  fields = [
    { key: 'id', title: 'ID', type: 'number' },
    { key: 'label', title: 'Bezeichnung', required: true },
    { key: 'publ', title: 'Verlag', type: 'publisher' },
    { key: 'start_date', title: 'Startdatum', type: 'date' },
    { key: 'end_date', title: 'Enddatum', type: 'date' },
    { key: 'internal_number', title: 'Interne Nummer' },
    { key: 'invoice_amount', title: 'Rechnungsbetrag', type: 'number' },
    { key: 'invoice_information', title: 'Rechnungsinformationen', type: 'text' },
    { key: 'sec_pub', title: 'Zweitveröffentlichungsoption', type: 'text' },
    { key: 'gold_option', title: 'Gold-Option', type: 'text' },
    { key: 'verification_method', title: 'Verifikationsmethode', type: 'text' },
    { key: 'identifier', title: 'Identifikatoren', type: 'id_table' },
  ]

  constructor(public dialogRef: MatDialogRef<ContractFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any, public service:ContractService, private publisherService:PublisherService) {}
  
  ngOnInit(): void {
  }
}
