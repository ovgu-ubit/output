import { Component,OnInit,AfterViewInit, ViewChild } from '@angular/core';
import { OACategoryIndex } from '../../../../../../output-interfaces/PublicationIndex';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { SelectionModel } from '@angular/cdk/collections';
import { Subject, concatMap, of } from 'rxjs';
import { TableComponent } from 'src/app/tools/table/table.component';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { OaCategoryFormComponent } from '../../windows/oa-category-form/oa-category-form.component';
import { CombineDialogComponent } from 'src/app/tools/combine-dialog/combine-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';
import { OACategoryService } from 'src/app/services/entities/oa-category.service';
import { ViewConfig, resetViewConfig, selectReportingYear, setViewConfig } from 'src/app/services/redux';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { SortDirection } from '@angular/material/sort';
import { CompareOperation, JoinOperation } from '../../../../../../output-interfaces/Config';
import { OA_Category } from '../../../../../../output-interfaces/Publication';

@Component({
  selector: 'app-oa-categories',
  templateUrl: './oa-categories.component.html',
  styleUrls: ['./oa-categories.component.css']
})
export class OaCategoriesComponent implements TableParent<OACategoryIndex>, OnInit{
  buttons: TableButton[] = [
  ];
  loading: boolean = true;
  destroy$ = new Subject();
    
  formComponent = OaCategoryFormComponent;

  oa_cats:OACategoryIndex[] = [];

  @ViewChild(TableComponent) table: TableComponent<OACategoryIndex, OA_Category>;
  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'label', colTitle: 'Bezeichnung' },
    { colName: 'is_oa', colTitle: 'Open-Access?', type:'boolean' },
    { colName: 'pub_count', colTitle: 'Anzahl Publikationen', type:'pubs' },
  ];
  reporting_year;

  constructor(public oaService:OACategoryService, private dialog:MatDialog, private _snackBar: MatSnackBar, private publicationService:PublicationService,
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
      return this.oaService.index(data);
    })).subscribe({
      next: data => {
        this.oa_cats = data;
        this.loading = false;
        this.table?.update(this.oa_cats);
      }, error: err => this._snackBar.open(`Backend nicht erreichbar`, 'Oh oh!', {
        panelClass: [`danger-snackbar`],
        verticalPosition: 'top'
      })
    })
  }
  
  getName() {
    return 'Open-Access-Kategorien';
  }

  getLink() {
    return '/master-data/oa-categories'
  }

  getLabel() {
    return '/Stammdaten/Open-Access-Kategorien'
  }
  
  async showPubs?(id:number,field?:string) {
    this.store.dispatch(resetViewConfig());
    let viewConfig:ViewConfig = {
      sortDir: 'asc' as SortDirection,
      filter: {
        filter: {
          expressions: [{
            op: JoinOperation.AND,
            key: 'oa_category_id',
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
