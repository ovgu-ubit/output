import { Component,OnInit,AfterViewInit, ViewChild } from '@angular/core';
import { Contract } from '../../../../../../output-interfaces/Publication';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { TableComponent } from 'src/app/tools/table/table.component';
import { SelectionModel } from '@angular/cdk/collections';
import { Subject, concat, concatMap, delay, map, merge, of, takeUntil } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ContractIndex } from '../../../../../../output-interfaces/PublicationIndex';
import { ContractFormComponent } from '../../windows/contract-form/contract-form.component';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';
import { CombineDialogComponent } from 'src/app/tools/combine-dialog/combine-dialog.component';
import { ContractService } from 'src/app/services/entities/contract.service';
import { SortDirection } from '@angular/material/sort';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { ViewConfig, resetViewConfig, selectReportingYear, setViewConfig } from 'src/app/services/redux';
import { CompareOperation, JoinOperation } from '../../../../../../output-interfaces/Config';

@Component({
  selector: 'app-contracts',
  templateUrl: './contracts.component.html',
  styleUrls: ['./contracts.component.css']
})
export class ContractsComponent implements TableParent<ContractIndex>, OnInit{
  buttons: TableButton[] = [
  ];
  loading: boolean;
  destroy$ = new Subject();

  formComponent = ContractFormComponent;

  contracts:ContractIndex[] = [];

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

  constructor(public contractService:ContractService, private dialog:MatDialog, private _snackBar: MatSnackBar, private publicationService:PublicationService,
    private store:Store, private router:Router) {}

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
      this.headers.find(e => e.colName === 'pub_count').colTitle += ' '+data
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
  
  async showPubs?(id:number,field?:string) {
    this.store.dispatch(resetViewConfig());
    let viewConfig:ViewConfig = {
      sortDir: 'asc' as SortDirection,
      filter: {
        filter: {
          expressions: [{
            op: JoinOperation.AND,
            key: 'contract_id',
            comp: CompareOperation.EQUALS,
            value: id
          },{
            op: JoinOperation.AND,
            key: 'pub_date',
            comp: CompareOperation.GREATER_THAN,
            value: (Number(this.reporting_year)-1)+'-12-31 23:59:59'
          },{
            op: JoinOperation.AND,
            key: 'pub_date',
            comp: CompareOperation.SMALLER_THAN,
            value: (Number(this.reporting_year)+1)+'-01-01 00:00:00'
          }]
        }
      }
    }
    this.store.dispatch(setViewConfig({viewConfig}))
    this.router.navigateByUrl('publications')
  }
}
