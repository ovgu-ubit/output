import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { Component,OnInit,AfterViewInit, ViewChild } from '@angular/core';
import { FunderIndex } from '../../../../../../output-interfaces/PublicationIndex';
import { SelectionModel } from '@angular/cdk/collections';
import { Subject, concatMap, of } from 'rxjs';
import { TableComponent } from 'src/app/tools/table/table.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { CombineDialogComponent } from 'src/app/tools/combine-dialog/combine-dialog.component';
import { FunderFormComponent } from '../../windows/funder-form/funder-form.component';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';
import { FunderService } from 'src/app/services/entities/funder.service';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { ViewConfig, resetViewConfig, selectReportingYear, setViewConfig } from 'src/app/services/redux';
import { SortDirection } from '@angular/material/sort';
import { CompareOperation, JoinOperation } from '../../../../../../output-interfaces/Config';
import { Funder } from '../../../../../../output-interfaces/Publication';

@Component({
  selector: 'app-funders',
  templateUrl: './funders.component.html',
  styleUrls: ['./funders.component.css']
})
export class FundersComponent implements TableParent<FunderIndex>, OnInit{
  buttons: TableButton[] = [
  ];
  loading: boolean = true;
  selection: SelectionModel<any> = new SelectionModel<any>(true, []);
  destroy$ = new Subject();
  
  formComponent = FunderFormComponent;

  funders:FunderIndex[] = [];

  @ViewChild(TableComponent) table: TableComponent<FunderIndex, Funder>;
  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'label', colTitle: 'Bezeichnung' },
    { colName: 'doi', colTitle: 'DOI', type:'doi' },
    { colName: 'ror_id', colTitle: 'ROR ID' },
    { colName: 'pub_count', colTitle: 'Anzahl Publikationen', type:'pubs' },
  ];
  reporting_year;

  constructor(public funderService:FunderService, private dialog:MatDialog, private _snackBar: MatSnackBar, private publicationService:PublicationService,
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
      return this.funderService.index(data);
    })).subscribe({
      next: data => {
        this.funders = data;
        this.loading = false;
        this.table?.update(this.funders);
      }, error: err => this._snackBar.open(`Backend nicht erreichbar`, 'Oh oh!', {
        panelClass: [`danger-snackbar`],
        verticalPosition: 'top'
      })
    })
  }
  
  getName() {
    return 'Förderer';
  }

  getLink() {
    return '/master-data/funders'
  }

  getLabel() {
    return '/Stammdaten/Förderer'
  }
  
  update(): void {
    this.loading = true;
    this.funderService.index(this.reporting_year).subscribe({
      next: data => {
        this.funders = data;
        this.loading = false;
        this.table?.update(this.funders);
      }
    })
  }
  
  async showPubs?(id:number,field?:string) {
    this.store.dispatch(resetViewConfig());
    let viewConfig:ViewConfig = {
      sortDir: 'asc' as SortDirection,
      filter: {
        filter: {
          expressions: [{
            op: JoinOperation.AND,
            key: 'funder_id',
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
