import { Component,OnInit,AfterViewInit, ViewChild } from '@angular/core';
import { PublicationTypeIndex } from '../../../../../../output-interfaces/PublicationIndex';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { SelectionModel } from '@angular/cdk/collections';
import { Subject, concatMap, of } from 'rxjs';
import { TableComponent } from 'src/app/tools/table/table.component';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PubTypeFormComponent } from '../../windows/pub-type-form/pub-type-form.component';
import { CombineDialogComponent } from 'src/app/tools/combine-dialog/combine-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';
import { PublicationTypeService } from 'src/app/services/entities/publication-type.service';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { ViewConfig, resetViewConfig, selectReportingYear, setViewConfig } from 'src/app/services/redux';
import { SortDirection } from '@angular/material/sort';
import { CompareOperation, JoinOperation } from '../../../../../../output-interfaces/Config';
import { PublicationType } from '../../../../../../output-interfaces/Publication';

@Component({
  selector: 'app-pub-types',
  templateUrl: './pub-types.component.html',
  styleUrls: ['./pub-types.component.css']
})
export class PubTypesComponent implements TableParent<PublicationTypeIndex>, OnInit{
  buttons: TableButton[] = [
  ];
  loading: boolean = true;
  destroy$ = new Subject();
    
  formComponent = PubTypeFormComponent;

  pub_types:PublicationTypeIndex[] = [];

  @ViewChild(TableComponent) table: TableComponent<PublicationTypeIndex, PublicationType>;
  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'label', colTitle: 'Bezeichnung' },
    { colName: 'review', colTitle: 'Begutachtet?', type:'boolean' },
    { colName: 'pub_count', colTitle: 'Anzahl Publikationen', type:'pubs' },
  ];
  reporting_year;

  constructor(public pubTypeService:PublicationTypeService, private dialog:MatDialog, private _snackBar: MatSnackBar, private publicationService:PublicationService,
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
      return this.pubTypeService.index(data);
    })).subscribe({
      next: data => {
        this.pub_types = data;
        this.loading = false;
        this.table?.update(this.pub_types);
      }, error: err => this._snackBar.open(`Backend nicht erreichbar`, 'Oh oh!', {
        panelClass: [`danger-snackbar`],
        verticalPosition: 'top'
      })
    })
  }
  
  getName() {
    return 'Publikationsarten';
  }

  getLink() {
    return '/master-data/pub_types'
  }

  getLabel() {
    return '/Stammdaten/Publikationsarten'
  }
  
  async showPubs?(id:number,field?:string) {
    this.store.dispatch(resetViewConfig());
    let viewConfig:ViewConfig = {
      sortDir: 'asc' as SortDirection,
      filter: {
        filter: {
          expressions: [{
            op: JoinOperation.AND,
            key: 'pub_type_id',
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
