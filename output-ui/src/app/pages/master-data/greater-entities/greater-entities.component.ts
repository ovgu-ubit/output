import { SelectionModel } from '@angular/cdk/collections';
import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { Subject, concatMap, of } from 'rxjs';
import { GreaterEntity } from '../../../../../../output-interfaces/Publication';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { TableComponent } from 'src/app/tools/table/table.component';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GreaterEntityIndex } from '../../../../../../output-interfaces/PublicationIndex';
import { GreaterEntityFormComponent } from '../../windows/greater-entity-form/greater-entity-form.component';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';
import { CombineDialogComponent } from 'src/app/tools/combine-dialog/combine-dialog.component';
import { GreaterEntityService } from 'src/app/services/entities/greater-entity.service';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { ViewConfig, resetViewConfig, selectReportingYear, setViewConfig } from 'src/app/services/redux';
import { SortDirection } from '@angular/material/sort';
import { CompareOperation, JoinOperation } from '../../../../../../output-interfaces/Config';

@Component({
  selector: 'app-greater-entities',
  templateUrl: './greater-entities.component.html',
  styleUrls: ['./greater-entities.component.css']
})
export class GreaterEntitiesComponent implements TableParent<GreaterEntityIndex>, OnInit{
  buttons: TableButton[] = [
  ];
  loading: boolean = true;
  selection: SelectionModel<any> = new SelectionModel<any>(true, []);
  destroy$ = new Subject();

  formComponent = GreaterEntityFormComponent;

  ges:GreaterEntityIndex[] = [];

  @ViewChild(TableComponent) table: TableComponent<GreaterEntityIndex, GreaterEntity>;
  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'label', colTitle: 'Bezeichnung' },
    { colName: 'rating', colTitle: 'Bemerkung' },
    { colName: 'identifiers', colTitle: 'Identifikatoren' },
    { colName: 'doaj_since', colTitle: 'Im DOAJ seit', type: 'date' },
    { colName: 'doaj_until', colTitle: 'Im DOAJ bis', type: 'date' },
    { colName: 'pub_count', colTitle: 'Anzahl Publikationen', type:'pubs' },
  ];
  reporting_year;

  constructor(public geService:GreaterEntityService, private dialog:MatDialog, private _snackBar: MatSnackBar, private publicationService:PublicationService,
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
      return this.geService.index(data);
    })).subscribe({
      next: data => {
        this.ges = data;
        this.loading = false;
        this.table?.update(this.ges);
      }, error: err => this._snackBar.open(`Backend nicht erreichbar`, 'Oh oh!', {
        panelClass: [`danger-snackbar`],
        verticalPosition: 'top'
      })
    })
  }
  
  getName() {
    return 'Größere Einheiten';
  }

  getLink() {
    return '/master-data/greater-entities'
  }

  getLabel() {
    return '/Stammdaten/Größere Einheiten'
  }
  
  update(): void {
    this.loading = true;
    this.geService.index(this.reporting_year).subscribe({
      next: data => {
        this.ges = data;
        this.loading = false;
        this.table?.update(this.ges);
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
            key: 'greater_entity_id',
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

