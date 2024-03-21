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
    { title: 'Hinzufügen', action_function: this.add.bind(this), roles: ['writer','admin'] },
    { title: 'Löschen', action_function: this.deleteSelected.bind(this), roles: ['writer','admin'] },
    { title: 'Zusammenführen', action_function: this.combine.bind(this), roles: ['writer','admin'] },
  ];
  loading: boolean;
  selection: SelectionModel<any> = new SelectionModel<any>(true, []);
  destroy$ = new Subject();

  contracts:ContractIndex[] = [];

  @ViewChild(TableComponent) table: TableComponent<ContractIndex>;
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

  constructor(private contractService:ContractService, private dialog:MatDialog, private _snackBar: MatSnackBar, private publicationService:PublicationService,
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
  
  update(): void {
    this.loading = true;
    this.contractService.index(this.reporting_year).subscribe({
      next: data => {
        this.contracts = data;
        this.loading = false;
        this.table?.update(this.contracts);
      }
    })
  }

  edit(row: any): void {
    let dialogRef = this.dialog.open(ContractFormComponent, {
      width: '800px',
      maxHeight: '800px',
      data: {
        contract: {id: row.id}
      },
      disableClose: true
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.label) {
        this.contractService.update(result).subscribe({
          next: data => {
            this._snackBar.open(`Vertrag geändert`, 'Super!', {
              duration: 5000,
              panelClass: [`success-snackbar`],
              verticalPosition: 'top'
            })
            this.update();
          }, error: err => {
            this._snackBar.open(`Fehler beim Ändern des Vertrags`, 'Oh oh!', {
              duration: 5000,
              panelClass: [`danger-snackbar`],
              verticalPosition: 'top'
            })
            console.log(err);
          }
        })
      } else if (result && result.id) {
        this.contractService.update(result).subscribe();
      }

    });
  }

  combine() {
    if (this.selection.selected.length < 2) {
      this._snackBar.open(`Bitte selektieren Sie min. zwei Verträge`, 'Alles klar!', {
        duration: 5000,
        panelClass: [`warning-snackbar`],
        verticalPosition: 'top'
      })
    } else {
      //selection dialog
      let dialogRef = this.dialog.open(CombineDialogComponent<Contract>, {
        width: '800px',
        maxHeight: '800px',
        data: {
          ents: this.selection.selected
        },
        disableClose: true
      });
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.contractService.combine(result.id, this.selection.selected.filter(e => e.id !== result.id).map(e => e.id)).subscribe({
            next: data => {
              this._snackBar.open(`Institute wurden zusammengeführt`, 'Super!', {
                duration: 5000,
                panelClass: [`success-snackbar`],
                verticalPosition: 'top'
              })
              this.update();
            }, error: err => {
              this._snackBar.open(`Fehler beim Zusammenführen`, 'Oh oh!', {
                duration: 5000,
                panelClass: [`danger-snackbar`],
                verticalPosition: 'top'
              })
              console.log(err);
            }
          })
        }
      });
    }
  }

  add() {
    let dialogRef = this.dialog.open(ContractFormComponent, {
      width: '800px',
      maxHeight: '800px',
      data: {
        contract: {
          
        }
      },
      disableClose: true
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.contractService.insert(result).subscribe({
          next: data => {
            this._snackBar.open(`Vertrag wurde angelegt`, 'Super!', {
              duration: 5000,
              panelClass: [`success-snackbar`],
              verticalPosition: 'top'
            })
            this.update();
          }, error: err => {
            this._snackBar.open(`Fehler beim Einfügen`, 'Oh oh!', {
              duration: 5000,
              panelClass: [`danger-snackbar`],
              verticalPosition: 'top'
            })
            console.log(err);
          }
        })
      }

    });
  }
  deleteSelected() {
    //TODO: soft delete option
    if (this.selection.selected.length === 0) return;
    let dialogData = new ConfirmDialogModel(this.selection.selected.length + " Verträge löschen", `Möchten Sie ${this.selection.selected.length} Verträge löschen, dies kann nicht rückgängig gemacht werden?`);

    let dialogRef = this.dialog.open(ConfirmDialogComponent, {
      maxWidth: "400px",
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(dialogResult => {
      if (dialogResult) {
        this.contractService.delete(this.selection.selected).subscribe({
          next: data => {
            this._snackBar.open(`${data['affected']} Institute gelöscht`, 'Super!', {
              duration: 5000,
              panelClass: [`success-snackbar`],
              verticalPosition: 'top'
            })
            this.update();
          }, error: err => {
            this._snackBar.open(`Fehler beim Löschen der Institute`, 'Oh oh!', {
              duration: 5000,
              panelClass: [`danger-snackbar`],
              verticalPosition: 'top'
            })
            console.log(err);
          }
        })
      }
    });
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
            value: (this.reporting_year-1)+'-12-31 23:59:59'
          },{
            op: JoinOperation.AND,
            key: 'pub_date',
            comp: CompareOperation.SMALLER_THAN,
            value: (this.reporting_year+1)+'-01-01 00:00:00'
          }]
        }
      }
    }
    this.store.dispatch(setViewConfig({viewConfig}))
    this.router.navigateByUrl('publications')
  }
}
