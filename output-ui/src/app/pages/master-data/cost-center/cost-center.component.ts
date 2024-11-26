import { Component,OnInit,AfterViewInit,ViewChild } from '@angular/core';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { CostCenter } from '../../../../../../output-interfaces/Publication';
import { concatMap, of, Subject } from 'rxjs';
import { SelectionModel } from '@angular/cdk/collections';
import { TableComponent } from 'src/app/tools/table/table.component';
import { CostCenterService } from 'src/app/services/entities/cost-center.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CostCenterFormComponent } from '../../windows/cost-center-form/cost-center-form.component';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';
import { CostCenterIndex } from '../../../../../../output-interfaces/PublicationIndex';
import { Store } from '@ngrx/store';
import { resetViewConfig, selectReportingYear, setViewConfig, ViewConfig } from 'src/app/services/redux';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { SortDirection } from '@angular/material/sort';
import { CompareOperation, JoinOperation } from '../../../../../../output-interfaces/Config';
import { Router } from '@angular/router';

@Component({
  selector: 'app-cost-center',
  templateUrl: './cost-center.component.html',
  styleUrls: ['./cost-center.component.css']
})
export class CostCenterComponent implements TableParent<CostCenterIndex>, OnInit{
  buttons: TableButton[] = [
    { title: 'Hinzufügen', action_function: this.add.bind(this), roles: ['writer','admin'] },
    { title: 'Löschen', action_function: this.deleteSelected.bind(this), roles: ['writer','admin'] },
  ];
  loading: boolean = true;
  selection: SelectionModel<CostCenterIndex> = new SelectionModel<CostCenterIndex>(true, []);
  destroy$ = new Subject();

  cost_centers:CostCenterIndex[] = [];

  @ViewChild(TableComponent) table: TableComponent<CostCenter>;
  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'number', colTitle: 'Nummer' },
    { colName: 'label', colTitle: 'Bezeichnung' },
    { colName: 'pub_count', colTitle: 'Anzahl Publikationen', type: 'pubs' }
  ];
  reporting_year:number;

  constructor(private ccService:CostCenterService, private dialog:MatDialog, private _snackBar: MatSnackBar, private store:Store,
    private publicationService:PublicationService, private router:Router
  ) {}

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
      return this.ccService.getCostCenterIndex(data);
    })).subscribe({
      next: data => {
        this.cost_centers = data;
        this.loading = false;
        this.table?.update(this.cost_centers)
      }, error: err => this._snackBar.open(`Backend nicht erreichbar`, 'Oh oh!', {
        panelClass: [`danger-snackbar`],
        verticalPosition: 'top'
      })
    })
  }
  
  getName() {
    return 'Kostenstellen';
  }

  getLink() {
    return '/master-data/cost_centers'
  }

  getLabel() {
    return '/Stammdaten/Kostenstellen'
  }
  
  update(): void {
    this.loading = true;
    this.ccService.getCostCenterIndex(this.reporting_year).subscribe({
      next: data => {
        this.cost_centers = data;
        this.loading = false;
        this.table?.update(this.cost_centers)
      }
    })
  }

  edit(row: any): void {
    let dialogRef = this.dialog.open(CostCenterFormComponent, {
      width: '800px',
      maxHeight: '800px',
      data: {
        cost_center: row
      },
      disableClose: true
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.label) {
        this.ccService.updateCostCenter(result).subscribe({
          next: data => {
            this._snackBar.open(`Kostenstelle geändert`, 'Super!', {
              duration: 5000,
              panelClass: [`success-snackbar`],
              verticalPosition: 'top'
            })
            this.update();
          }, error: err => {
            this._snackBar.open(`Fehler beim Ändern der Kostenstelle`, 'Oh oh!', {
              duration: 5000,
              panelClass: [`danger-snackbar`],
              verticalPosition: 'top'
            })
            console.log(err);
          }
        })
      }else if (result && result.id) {
        this.ccService.updateCostCenter(result).subscribe();
      }
    });
  }

  add() {
    let dialogRef = this.dialog.open(CostCenterFormComponent, {
      width: '800px',
      maxHeight: '800px',
      data: {
        
      },
      disableClose: true
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.ccService.updateCostCenter(result).subscribe({
          next: data => {
            this._snackBar.open(`Kostenstelle hinzugefügt`, 'Super!', {
              duration: 5000,
              panelClass: [`success-snackbar`],
              verticalPosition: 'top'
            })
            this.update();
          }, error: err => {
            if (err.status === 400) {
              this._snackBar.open(`Fehler beim Einfügen: ${err.error.message}`, 'Oh oh!', {
                duration: 5000,
                panelClass: [`danger-snackbar`],
                verticalPosition: 'top'
              })
            } else {
              this._snackBar.open(`Unerwarteter Fehler beim Einfügen`, 'Oh oh!', {
                duration: 5000,
                panelClass: [`danger-snackbar`],
                verticalPosition: 'top'
              })
              console.log(err);
            }
          }
        })
      }

    });
  }
  deleteSelected() {
    //TODO: soft delete option
    if (this.selection.selected.length === 0) return;
    let dialogData = new ConfirmDialogModel(this.selection.selected.length + " Kostenstellen löschen", `Möchten Sie ${this.selection.selected.length} Kostenstellen löschen, dies kann nicht rückgängig gemacht werden?`);

    let dialogRef = this.dialog.open(ConfirmDialogComponent, {
      maxWidth: "400px",
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(dialogResult => {
      if (dialogResult) {
        this.ccService.deleteCostCenter(this.selection.selected.map(e => {return {id:e.id}})).subscribe({
          next: data => {
            this._snackBar.open(`${data['affected']} Kostenstellen gelöscht`, 'Super!', {
              duration: 5000,
              panelClass: [`success-snackbar`],
              verticalPosition: 'top'
            })
            this.update();
          }, error: err => {
            this._snackBar.open(`Fehler beim Löschen der Kostenstellen`, 'Oh oh!', {
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
            key: 'cost_center_id',
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
