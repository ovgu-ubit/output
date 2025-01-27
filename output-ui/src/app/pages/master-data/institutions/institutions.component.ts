import { Component,OnInit,ViewChild, AfterViewInit } from '@angular/core';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { Institute } from '../../../../../../output-interfaces/Publication';
import { SelectionModel } from '@angular/cdk/collections';
import { Subject, concat, concatMap, firstValueFrom, from, of, timeout } from 'rxjs';
import { TableComponent } from 'src/app/tools/table/table.component';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { InstituteIndex } from '../../../../../../output-interfaces/PublicationIndex';
import { InstituteFormComponent } from '../../windows/institute-form/institute-form.component';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';
import { CombineDialogComponent } from 'src/app/tools/combine-dialog/combine-dialog.component';
import { ViewConfig, resetViewConfig, selectReportingYear, setViewConfig } from 'src/app/services/redux';
import { SortDirection } from '@angular/material/sort';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { InstituteService } from 'src/app/services/entities/institute.service';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { CompareOperation, JoinOperation } from '../../../../../../output-interfaces/Config';

@Component({
  selector: 'app-institutions',
  templateUrl: './institutions.component.html',
  styleUrls: ['./institutions.component.css']
})
export class InstitutionsComponent implements TableParent<Institute>, OnInit{
  buttons: TableButton[] = [
  ];
  loading: boolean = true;
  destroy$ = new Subject();

  institutes:InstituteIndex[] = [];
  
  formComponent = InstituteFormComponent;

  reporting_year;

  @ViewChild(TableComponent) table: TableComponent<InstituteIndex, Institute>;
  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID' , type: 'number'},
    { colName: 'label', colTitle: 'Bezeichnung' },
    { colName: 'short_label', colTitle: 'Kurzbezeichnung' },
    { colName: 'sub_inst_count', colTitle: 'Untergeordnete Institute gesamt', type: 'number'},
    { colName: 'author_count', colTitle: 'Anzahl Autoren', type: 'number' },
    { colName: 'author_count_total', colTitle: 'Anzahl Autoren gesamt', type: 'number' },
    { colName: 'pub_count', colTitle: 'Anzahl Publikationen', type: 'pubs'},
    { colName: 'pub_corr_count', colTitle: 'Anzahl Publikationen (corr.)', type: 'pubs' },
  ];

  constructor(public instService:InstituteService, private dialog:MatDialog, private _snackBar: MatSnackBar, private publicationService:PublicationService,
    private store:Store, private router:Router) {}

  ngOnInit(): void {
    this.store.select(selectReportingYear).pipe(concatMap(data => {
      if (data) {
        return of(data);
      } else {
        return this.publicationService.getDefaultReportingYear();
      }
    }), concatMap(data => {
      this.reporting_year = data;
      this.headers.find(e => e.colName === 'pub_count').colTitle += ' '+data
      this.headers.find(e => e.colName === 'pub_corr_count').colTitle += ' '+data
      return this.instService.index(data);
    })).subscribe({
      next: data => {
        this.institutes = data;
        this.loading = false;
        this.table?.update(this.institutes);
      }, error: err => this._snackBar.open(`Backend nicht erreichbar`, 'Oh oh!', {
        panelClass: [`danger-snackbar`],
        verticalPosition: 'top'
      })
    })
  }
  
  getName() {
    return 'Institute';
  }

  getLink() {
    return '/master-data/institutions'
  }

  getLabel() {
    return '/Stammdaten/Institute'
  }
  
  update(): void {
    this.loading = true;
    this.instService.index(this.reporting_year).subscribe({
      next: data => {
        this.institutes = data;
        this.loading = false;
        this.table?.update(this.institutes);
      }
    })
  }

  async showPubs?(id:number,field?:string) {
    //identify sub_institutes
    let ids = await firstValueFrom(this.instService.getSubInstitutes(id));
    ids.push(id);
    this.store.dispatch(resetViewConfig());
    let viewConfig:ViewConfig;
    if (field === 'pub_count') {
      viewConfig = {
        sortDir: 'asc' as SortDirection,
        filter: {
          filter: {
            expressions: [{
              op: JoinOperation.AND,
              key: 'institute_id',
              comp: CompareOperation.IN,
              value: '('+ids.join(',')+')'
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
    } else {
        viewConfig = {
          sortDir: 'asc' as SortDirection,
          filter: {
            filter: {
              expressions: [{
                op: JoinOperation.AND,
                key: 'institute_id_corr',
                comp: CompareOperation.IN,
                value: '('+ids.join(',')+')'
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
    }
    this.store.dispatch(setViewConfig({viewConfig}))
    this.router.navigateByUrl('publications')
  }
}
