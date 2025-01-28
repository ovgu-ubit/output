import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Subject, concatMap, of } from 'rxjs';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { ContractService } from 'src/app/services/entities/contract.service';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { selectReportingYear } from 'src/app/services/redux';
import { TableComponent } from 'src/app/tools/table/table.component';
import { Contract } from '../../../../../../output-interfaces/Publication';
import { ContractIndex } from '../../../../../../output-interfaces/PublicationIndex';
import { ContractFormComponent } from '../../windows/contract-form/contract-form.component';

@Component({
  selector: 'app-contracts',
  templateUrl: './contracts.component.html',
  styleUrls: ['./contracts.component.css']
})
export class ContractsComponent implements TableParent<ContractIndex>, OnInit {
  buttons: TableButton[] = [
  ];
  loading: boolean;
  destroy$ = new Subject();

  formComponent = ContractFormComponent;

  contracts: ContractIndex[] = [];

  @ViewChild(TableComponent) table: TableComponent<ContractIndex, Contract>;
  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'label', colTitle: 'Bezeichnung' },
    { colName: 'publisher', colTitle: 'Verlag' },
    { colName: 'start_date', colTitle: 'Seit', type: 'date' },
    { colName: 'end_date', colTitle: 'Bis', type: 'date' },
    { colName: 'invoice_amount', colTitle: 'Rechnungsbetrag', type: 'euro' },
    { colName: 'pub_count', colTitle: 'Anzahl Publikationen', type: 'pubs' },
  ];

  reporting_year;

  constructor(public contractService: ContractService, private dialog: MatDialog, private _snackBar: MatSnackBar, private publicationService: PublicationService,
    private store: Store, private router: Router) { }

  ngOnInit(): void {
    this.loading = true;
    this.store.select(selectReportingYear).pipe(concatMap(data => {
      if (data) {
        return of(data);
      } else {
        return this.publicationService.getDefaultReportingYear();
      }
    }), concatMap(data => {
      this.reporting_year = data;
      this.headers.find(e => e.colName === 'pub_count').colTitle += ' ' + data
      return this.contractService.index(data);
    })).subscribe({
      next: data => {
        this.contracts = data;
        this.loading = false;
        this.table.update(this.contracts);
      }, error: err => this._snackBar.open(`Backend nicht erreichbar`, 'Oh oh!', {
        panelClass: [`danger-snackbar`],
        verticalPosition: 'top'
      })
    })
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
