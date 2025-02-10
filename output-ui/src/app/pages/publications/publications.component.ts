import { Clipboard } from '@angular/cdk/clipboard';
import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, concatMap, map, merge } from 'rxjs';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { ConfigService } from 'src/app/services/config.service';
import { EnrichService } from 'src/app/services/enrich.service';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { ViewConfig, initialState, resetReportingYear, resetViewConfig, selectViewConfig, setReportingYear, setViewConfig } from 'src/app/services/redux';
import { TableComponent } from 'src/app/tools/table/table.component';
import { environment } from 'src/environments/environment';
import { CompareOperation, JoinOperation, SearchFilter, SearchFilterExpression } from '../../../../../output-interfaces/Config';
import { Publication } from '../../../../../output-interfaces/Publication';
import { PublicationIndex } from '../../../../../output-interfaces/PublicationIndex';
import { FilterViewComponent } from '../../tools/filter-view/filter-view.component';
import { PublicationFormComponent } from '../windows/publication-form/publication-form.component';
import { ReportingYearFormComponent } from '../windows/reporting-year-form/reporting-year-form.component';

@Component({
  selector: 'app-publications',
  templateUrl: './publications.component.html',
  styleUrls: ['./publications.component.css']
})
export class PublicationsComponent implements AfterViewInit, OnDestroy, TableParent<PublicationIndex> {
  constructor(public publicationService: PublicationService, public dialog: MatDialog, private route: ActivatedRoute,
    private _snackBar: MatSnackBar, private store: Store, private enrichService: EnrichService,
    private clipboard: Clipboard, private configService: ConfigService) { }

  name = 'Publikationen des Jahres ';
  institution = '';

  indexOptions?: { soft: boolean, filter: SearchFilter, paths?: string[] };

  soft_deletes = false;

  buttons: TableButton[] = [
    { title: 'search', action_function: this.extendedFilters.bind(this), icon: true, tooltip: 'Publikationen suchen und filtern' },
    {
      title: 'Anzeigeoptionen', action_function: () => { }, sub_buttons: [
        { title: 'Berichtsjahr ändern', action_function: this.changeReportingYear.bind(this) },
        { title: 'Ansicht zurücksetzen', action_function: this.resetView.bind(this) },
        { title: 'Soft-Deletes verwalten', action_function: this.softdeletes.bind(this), roles: ['writer', 'admin'] },
        { title: 'Link zur aktuellen Ansicht erzeugen', action_function: this.createLink.bind(this) },
      ]
    },
    { title: 'Sperren', action_function: this.lockSelected.bind(this), roles: ['writer', 'admin'] },
  ];

  formComponent = PublicationFormComponent;

  @ViewChild(TableComponent) table: TableComponent<PublicationIndex, Publication>;
  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
  ];
  viewConfig: ViewConfig;

  preProcessing() {
    let ob$: Observable<any> = this.enrichService.getEnrichs().pipe(map(data => {
      let sub_buttons = data.map(e => {
        return {
          title: e.label, action_function: function () {
            return this.startEnrich(e.path)
          }.bind(this)
        }
      });
      this.buttons.push({
        title: 'Anreichern mit', action_function: () => { }, sub_buttons, roles: ['admin']
      })
    }))

    ob$ = merge(ob$, this.configService.getIndexColumns().pipe(concatMap(data => {
      let headers: TableHeader[] = [{ colName: 'id', colTitle: 'ID', type: 'number' }];
      if (data.includes("title")) headers.push({ colName: 'title', colTitle: 'Titel' })
      if (data.includes("doi")) headers.push({ colName: 'doi', colTitle: 'DOI', type: 'doi' })
      if (data.includes("link")) headers.push({ colName: 'link', colTitle: 'Link', type: 'link' })
      if (data.includes("authors")) headers.push({ colName: 'authors', colTitle: 'Autoren' })
      if (data.includes("authors_inst")) headers.push({ colName: 'authors_inst', colTitle: 'Autoren ' + this.institution, type: 'authors' })
      if (data.includes("corr_inst")) headers.push({ colName: 'corr_inst', colTitle: 'Corr. Institut' })
      if (data.includes("pub_type")) headers.push({ colName: 'pub_type', colTitle: 'Publikationsart' })
      if (data.includes("greater_entity")) headers.push({ colName: 'greater_entity', colTitle: 'Größere Einheit' })
      if (data.includes("publisher")) headers.push({ colName: 'publisher', colTitle: 'Verlag' })
      if (data.includes("contract")) headers.push({ colName: 'contract', colTitle: 'Vertrag' })
      if (data.includes("oa_category")) headers.push({ colName: 'oa_category', colTitle: 'OA-Kategorie' })
      if (data.includes("locked_status")) headers.push({ colName: 'locked_status', colTitle: 'Lock-Status' })
      if (data.includes("status")) headers.push({ colName: 'status', colTitle: 'Status', type: 'number' })
      if (data.includes("pub_date")) headers.push({ colName: 'pub_date', colTitle: 'Publikationsdatum', type: 'date' })
      if (data.includes("edit_date")) headers.push({ colName: 'edit_date', colTitle: 'Zul. geändert', type: 'datetime' })
      if (data.includes("import_date")) headers.push({ colName: 'import_date', colTitle: 'Hinzugefügt', type: 'datetime' })
      if (data.includes("data_source")) headers.push({ colName: 'data_source', colTitle: 'Datenquelle' })
      this.headers = headers;
      return this.configService.getInstition().pipe(map(data => {
        this.institution = data.short_label;
        let header = this.headers.find(e => e.colName === 'authors_inst')
        if (header) header.colTitle = 'Autoren ' + this.institution;
      }))
    })))

    ob$ = merge(ob$, this.store.select(selectViewConfig).pipe(concatMap(viewConfig => {
      this.viewConfig = viewConfig;
      return this.route.queryParamMap.pipe(map(params => {
        let filter = this.queryToFilter(params);
        if (filter) this.viewConfig = { ...this.viewConfig, filter }

        this.indexOptions = { soft: false, filter: this.viewConfig.filter?.filter, paths: this.viewConfig.filter?.paths }
      }));
    })));

    return ob$;
  }

  ngAfterViewInit(): void {
    this.store.select(selectViewConfig).subscribe(data => this.table.setViewConfig(data))
  }

  ngOnDestroy(): void {
    this.store.dispatch(setViewConfig({
      viewConfig: { ...this.table.getViewConfig(), filter: { filter: this.indexOptions.filter, paths: this.indexOptions.paths } }
    }))
  }

  changeReportingYear() {
    let dialogRef = this.dialog.open(ReportingYearFormComponent, {
      width: '400px',
      disableClose: true,
      data: {
        reporting_year: this.table?.reporting_year
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result !== undefined) {
        this.table.reporting_year = result;
        this.store.dispatch(setReportingYear({ reporting_year: this.table.reporting_year }))
        this.table.updateData().subscribe();
      }
    });
  }

  lockSelected() {
    if (this.table.selection.selected.length === 0) return;
    let save = []
    for (let pub of this.table.selection.selected) {
      save.push({ id: pub.id, locked: !pub.locked });
    }
    this.publicationService.updateAll(save).subscribe({
      next: data => {
        this._snackBar.open(`Sperr-Status von ${data} Publikationen geändert`, 'Super!', {
          duration: 5000,
          panelClass: [`success-snackbar`],
          verticalPosition: 'top'
        })
        this.table.updateData().subscribe();
      }, error: err => {
        this._snackBar.open(`Fehler beim Ändern der Publikation`, 'Oh oh!', {
          duration: 5000,
          panelClass: [`danger-snackbar`],
          verticalPosition: 'top'
        })
        console.log(err);
      }
    })
  }

  startEnrich(name: string) {
    if (this.table.selection.selected.length === 0) return;
    let save = []
    for (let pub of this.table.selection.selected) {
      if (!pub.locked) save.push(pub.id);
    }
    this.enrichService.startID(name, save).subscribe({
      next: data => {
        this._snackBar.open(`Anreichern wurde gestartet`, 'Super!', {
          duration: 5000,
          panelClass: [`success-snackbar`],
          verticalPosition: 'top'
        })
        this.table.updateData().subscribe();
      }
    })
  }

  resetView() {
    this.name = 'Publikationen des Jahres ' + this.table.reporting_year;
    this._snackBar.open(`Ansicht wurde zurückgesetzt`, 'Super!', {
      duration: 5000,
      panelClass: [`success-snackbar`],
      verticalPosition: 'top'
    });
    this.store.dispatch(resetViewConfig())
    this.store.dispatch(resetReportingYear())
    this.viewConfig = initialState.viewConfig
    this.indexOptions = {
      soft: false,
      filter: null,
      paths: null
    }
    this.publicationService.getDefaultReportingYear().pipe(concatMap(data => {
      this.table.reporting_year = data;
      if (data) this.name = 'Publikationen des Jahres ' + data;
      else this.name = 'Publikationen des Jahres ohne Datumsangabe'
      return this.table.updateData();
    })).subscribe();
  }

  extendedFilters() {
    let dialogRef = this.dialog.open(FilterViewComponent, {
      width: '800px',
      maxHeight: '800px',
      disableClose: false,
      data: {
        viewConfig: this.viewConfig
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.viewConfig = { ...this.viewConfig, filter: { filter: result.filter, paths: result.paths } }
        if (result.filter.expressions.length > 0 || result.paths.length > 0) {
          this.name = 'Gefilterte Publikationen';
          this.indexOptions = {
            soft: false,
            filter: result.filter,
            paths: result.paths
          }
          this.table.updateData().subscribe();
        } else this.resetView()
      }
    })
  }

  softdeletes() {
    this.name = 'Soft-deleted Publikationen';
    this._snackBar.open(`Ansicht wurde geändert`, 'Super!', {
      duration: 5000,
      panelClass: [`success-snackbar`],
      verticalPosition: 'top'
    });
    this.store.dispatch(resetViewConfig())
    this.store.dispatch(resetReportingYear())
    this.indexOptions = {
      soft: true,
      filter: null,
      paths: null
    }
    this.table.updateData().subscribe()
  }

  createLink() {
    this.store.dispatch(setViewConfig({
      viewConfig: { ...this.table.getViewConfig(), filter: { filter: this.indexOptions?.filter, paths: this.indexOptions?.paths } }
    }))
    let link = environment.self + 'publications' + this.filterToQuery()
    if (this.clipboard.copy(link)) {
      this._snackBar.open(`Link wurde in die Zwischenablage kopiert`, 'Super!', {
        duration: 5000,
        panelClass: [`success-snackbar`],
        verticalPosition: 'top',
      });
    }
  }

  filterToQuery(): string {
    if (!this.indexOptions) return '';
    let res = '?';
    if (this.indexOptions.filter) for (let expr of this.indexOptions.filter.expressions) {
      res += 'filter=' + expr.op + ',' + expr.key + ',' + expr.comp + ',' + expr.value + '&';
    }
    if (this.indexOptions.filter?.expressions.length > 0) res = res.slice(0, res.length - 1) + '&';
    if (this.indexOptions.paths) for (let path of this.indexOptions.paths) {
      res += 'path=' + path + '&';
    }
    if (this.indexOptions.paths?.length > 0) res = res.slice(0, res.length - 1);
    return res;
  }

  queryToFilter(paramMap: ParamMap): { filter: SearchFilter, paths: string[] } {
    let flag = false;
    let res = {
      filter: {
        expressions: []
      }, paths: []
    };
    let filters = paramMap.getAll('filter');
    res.paths = paramMap.getAll('path');
    for (let e of filters) {
      let split = e.split(',')
      let expr: SearchFilterExpression = {
        op: Number(split[0]) as JoinOperation,
        key: split[1],
        comp: Number(split[2]) as CompareOperation,
        value: split[3]
      }
      res.filter.expressions.push(expr);
      flag = true;
    }
    if (flag) return res;
    else return null;
  }

  getName() {
    return this.name;
  }

  getLink() {
    return '/publications'
  }

  getLabel() {
    return '/Publikationen'
  }

}
