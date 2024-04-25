import { SelectionModel } from '@angular/cdk/collections';
import { Location } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Clipboard } from '@angular/cdk/clipboard';
import { ActivatedRoute, ParamMap, Router, UrlSerializer } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject, concat, concatMap, concatWith, firstValueFrom, map, of, takeUntil } from 'rxjs';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { EnrichService } from 'src/app/services/enrich.service';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { ViewConfig, initialState, resetReportingYear, resetViewConfig, selectReportingYear, selectViewConfig, setReportingYear, setViewConfig } from 'src/app/services/redux';
import { CombineDialogComponent } from 'src/app/tools/combine-dialog/combine-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';
import { TableComponent } from 'src/app/tools/table/table.component';
import { environment } from 'src/environments/environment';
import { Publication } from '../../../../../output-interfaces/Publication';
import { PublicationIndex } from '../../../../../output-interfaces/PublicationIndex';
import { FilterViewComponent } from '../../tools/filter-view/filter-view.component';
import { PublicationFormComponent } from '../windows/publication-form/publication-form.component';
import { ReportingYearFormComponent } from '../windows/reporting-year-form/reporting-year-form.component';
import { DeletePublicationDialogComponent } from 'src/app/tools/delete-publication-dialog/delete-publication-dialog.component';
import { CompareOperation, JoinOperation, SearchFilter, SearchFilterExpression } from '../../../../../output-interfaces/Config';

@Component({
  selector: 'app-publications',
  templateUrl: './publications.component.html',
  styleUrls: ['./publications.component.css']
})
export class PublicationsComponent implements OnInit, OnDestroy, TableParent<PublicationIndex> {
  constructor(private publicationService: PublicationService, public dialog: MatDialog, private route: ActivatedRoute,
    private location: Location, private router: Router, private _snackBar: MatSnackBar, private store: Store, private enrichService: EnrichService,
    private clipboard: Clipboard) { }

  name = 'Publikationen des Jahres ';

  reporting_year: number;
  filter: { filter: SearchFilter, paths?: string[] };
  id;

  buttons: TableButton[] = [
    { title: 'search', action_function: this.extendedFilters.bind(this), icon: true, tooltip: 'Publikationen suchen und filtern' },
    {
      title: 'Anzeigeoptionen', action_function: () => { }, sub_buttons: [
        { title: 'Berichtsjahr ändern', action_function: this.changeReportingYear.bind(this) },
        { title: 'Ansicht zurücksetzen', action_function: this.resetView.bind(this) },
        { title: 'Soft-Deletes verwalten', action_function: this.softdeletes.bind(this),  roles: ['writer','admin']},
        { title: 'Link zur aktuellen Ansicht erzeugen', action_function: this.createLink.bind(this) },
      ]
    },
    { title: 'Sperren', action_function: this.lockSelected.bind(this), roles: ['writer','admin'] },
    { title: 'Hinzufügen', action_function: this.addPublication.bind(this), roles: ['writer','admin'] },
    { title: 'Löschen', action_function: this.deleteSelected.bind(this), roles: ['writer','admin'] },
    { title: 'Zusammenführen', action_function: this.combine.bind(this), roles: ['writer','admin'] },
  ];
  loading: boolean;
  selection: SelectionModel<any> = new SelectionModel<PublicationIndex>(true, []);

  destroy$ = new Subject();

  @ViewChild(TableComponent) table: TableComponent<PublicationIndex>;
  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'title', colTitle: 'Titel' },
    { colName: 'doi', colTitle: 'DOI', type: 'doi' },
    { colName: 'authors', colTitle: 'Autoren' },
    { colName: 'authors_inst', colTitle: 'Autoren ' + environment.institution, type: 'authors' },
    { colName: 'corr_inst', colTitle: 'Corr. Institut' },
    { colName: 'greater_entity', colTitle: 'Größere Einheit' },
    { colName: 'oa_category', colTitle: 'OA-Kategorie' },
    { colName: 'status', colTitle: 'Status', type: 'number' },
    { colName: 'edit_date', colTitle: 'Zul. geändert', type: 'datetime' },
    { colName: 'import_date', colTitle: 'Hinzugefügt', type: 'datetime' },
  ];

  publications: PublicationIndex[] = [];
  viewConfig: ViewConfig;

  ngOnInit(): void {
    this.loading = true;
    this.enrichService.getEnrichs().subscribe({
      next: data => {
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
      }
    })

    let ob$: Observable<any> = this.store.select(selectViewConfig).pipe(concatMap(viewConfig => {
      this.viewConfig = viewConfig;
      return this.route.queryParamMap.pipe(map(params => {
        if (params.get('id')) {
          this.id = params.get('id');
        }
        this.filter = this.queryToFilter(params);
        if (this.filter) this.viewConfig = { ...this.viewConfig, filter: this.filter }
      }));
    }));
    ob$ = ob$.pipe(concatMap(data => {
      return this.store.select(selectReportingYear).pipe(concatMap(data => {
        let ob1$: Observable<any>
        if (data) {
          ob1$ = of(data);
        } else {
          ob1$ = this.publicationService.getDefaultReportingYear();
        }
        return ob1$.pipe(map(data => {
          this.reporting_year = data;
        }));
      }));
    }))

    ob$ = ob$.pipe(concatMap(data => {
      if (!this.viewConfig?.filter || this.viewConfig?.filter.filter.expressions.length === 0 && this.viewConfig?.filter.paths.length === 0) {
        return this.publicationService.index(this.reporting_year).pipe(map(data => {
          this.publications = data;
          this.name = 'Publikationen des Jahres ' + this.reporting_year;
          this.table.update(this.publications);
          this.loading = false;
          if (this.id) {
            this.edit({ id: this.id });
          }
        }));
      } else {
        return this.publicationService.filter(this.viewConfig.filter.filter, this.viewConfig.filter.paths).pipe(map(data => {
          this.publications = data;
          this.filter = this.viewConfig.filter;
          this.name = 'Gefilterte Publikationen';
          this.table.update(this.publications);
          this.loading = false;
          if (this.id) {
            this.edit({ id: this.id });
          }
        }))
      }
    }))
    ob$.pipe(takeUntil(this.destroy$)).subscribe({
      next: data => {

      }, error: err => this._snackBar.open(`Backend nicht erreichbar`, 'Oh oh!', {
        panelClass: [`danger-snackbar`],
        verticalPosition: 'top'
      })
    })
    window.onbeforeunload = () => this.ngOnDestroy();
  }

  ngOnDestroy(): void {
    this.store.dispatch(setViewConfig({
      viewConfig: { ...this.table.getViewConfig(), filter: this.filter }
    }))
    this.destroy$.next('');
  }

  update(soft?: boolean): void {
    this.loading = true;
    if (!soft && (!this.filter || (this.filter.filter.expressions.length === 0 && this.filter.paths.length === 0))) this.publicationService.index(this.reporting_year).subscribe({
      next: data => {
        this.loading = false;
        this.publications = data;
        this.name = 'Publikationen des Jahres ' + this.reporting_year;
        this.table.update(this.publications);
      }, error: err => console.log(err)
    });
    else if (!soft && this.filter && (this.filter.filter.expressions.length > 0 || this.filter.paths.length > 0)) this.publicationService.filter(this.filter.filter, this.filter.paths).subscribe({
      next: data => {
        this.loading = false;
        this.publications = data;
        this.name = 'Gefilterte Publikationen'
        this.table.update(this.publications);
      }, error: err => console.log(err)
    });
    else if (soft) this.publicationService.softIndex().subscribe({
      next: data => {
        this.loading = false;
        this.publications = data;
        this.name = 'Soft-deleted Publikationen';
        this.table.update(this.publications);
      }, error: err => console.log(err)
    });
  }

  edit(row: any) {
    this.location.replaceState(this.router.url.split('?')[0], 'id=' + row.id)
    let dialogRef = this.dialog.open(PublicationFormComponent, {
      width: '800px',
      maxHeight: "90%",
      data: {
        id: row.id
      },
      disableClose: true
    });
    dialogRef.afterClosed().subscribe(result => {
      this.location.replaceState(this.router.url.split('?')[0])
      if (result && result.title) {
        this.publicationService.save([result]).subscribe({
          next: data => {
            this._snackBar.open(`Publikation geändert`, 'Super!', {
              duration: 5000,
              panelClass: [`success-snackbar`],
              verticalPosition: 'top'
            })
            this.update();
          }, error: err => {
            this._snackBar.open(`Fehler beim Ändern der Publikation`, 'Oh oh!', {
              duration: 5000,
              panelClass: [`danger-snackbar`],
              verticalPosition: 'top'
            })
            console.log(err);
          }
        })
      } else if (result && result.id) {
        this.publicationService.save([result]).subscribe();
      }
    });

  }

  changeReportingYear() {
    let dialogRef = this.dialog.open(ReportingYearFormComponent, {
      width: '400px',
      disableClose: true,
      data: {
        reporting_year: this.reporting_year
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.reporting_year = result;
        this.store.dispatch(setReportingYear({ reporting_year: this.reporting_year }))
        this.update();
      }
    });
  }

  lockSelected() {
    if (this.selection.selected.length === 0) return;
    let save = []
    for (let pub of this.selection.selected) {
      save.push({ id: pub.id, locked: !pub.locked });
    }
    this.publicationService.save(save).subscribe({
      next: data => {
        this._snackBar.open(`Sperr-Status von ${data} Publikationen geändert`, 'Super!', {
          duration: 5000,
          panelClass: [`success-snackbar`],
          verticalPosition: 'top'
        })
        this.update();
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

  deleteSelected() {
    if (this.selection.selected.length === 0) return;
    let dialogData = new ConfirmDialogModel(
      this.selection.selected.length + " Publikationen löschen",
      `Möchten Sie ${this.selection.selected.length} Publikationen löschen, dies kann nicht rückgängig gemacht werden?`
    );

    let dialogRef = this.dialog.open(DeletePublicationDialogComponent, {
      maxWidth: "400px",
      data: this.selection.selected
    });

    dialogRef.afterClosed().subscribe(dialogResult => {
      if (dialogResult) {
        this.publicationService.delete(this.selection.selected.map(e => { return { id: e.id } }), dialogResult.soft).subscribe({
          next: data => {
            this._snackBar.open(`${data['affected']} Publikationen gelöscht`, 'Super!', {
              duration: 5000,
              panelClass: [`success-snackbar`],
              verticalPosition: 'top'
            })
            this.update();
          }, error: err => {
            this._snackBar.open(`Fehler beim Löschen der Publikation`, 'Oh oh!', {
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

  addPublication() {
    let dialogRef = this.dialog.open(PublicationFormComponent, {
      width: '800px',
      maxHeight: '800px',
      data: {
      },
      disableClose: true
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        let pubInit = JSON.parse(JSON.stringify(result));
        pubInit.authorPublications = [];
        this.publicationService.insert(pubInit).subscribe({
          next: data => {
            result.id = data.id;
            for (let autPub of result.authorPublications) {
              autPub.publicationId = data.id;
            }
            this.publicationService.save([result]).subscribe({
              next: data => {
                this._snackBar.open(`Publikation hinzugefügt`, 'Super!', {
                  duration: 5000,
                  panelClass: [`success-snackbar`],
                  verticalPosition: 'top'
                })
                this.update()
              }, error: err => {
                this._snackBar.open(`Fehler beim Einfügen`, 'Oh oh!', {
                  duration: 5000,
                  panelClass: [`danger-snackbar`],
                  verticalPosition: 'top'
                })
                console.log(err);
              }
            })
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

  startEnrich(name: string) {
    if (this.selection.selected.length === 0) return;
    let save = []
    for (let pub of this.selection.selected) {
      if (!pub.locked) save.push(pub.id);
    }
    this.enrichService.startID(name, save).subscribe({
      next: data => {
        this._snackBar.open(`Anreichern wurde gestartet`, 'Super!', {
          duration: 5000,
          panelClass: [`success-snackbar`],
          verticalPosition: 'top'
        })
        this.update();
      }
    })
  }

  combine() {
    if (this.selection.selected.length < 2) {
      this._snackBar.open(`Bitte selektieren Sie min. zwei Publikationen`, 'Alles klar!', {
        duration: 5000,
        panelClass: [`warning-snackbar`],
        verticalPosition: 'top'
      })
    } else {
      //selection dialog
      let dialogRef = this.dialog.open(CombineDialogComponent<Publication>, {
        width: '800px',
        maxHeight: '800px',
        data: {
          ents: this.selection.selected
        },
        disableClose: true
      });
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.publicationService.combine(result.id, this.selection.selected.filter(e => e.id !== result.id).map(e => e.id)).subscribe({
            next: data => {
              this._snackBar.open(`Publikationen wurden zusammengeführt`, 'Super!', {
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

  resetView() {
    this._snackBar.open(`Ansicht wurde zurückgesetzt`, 'Super!', {
      duration: 5000,
      panelClass: [`success-snackbar`],
      verticalPosition: 'top'
    });
    this.store.dispatch(resetViewConfig())
    this.store.dispatch(resetReportingYear())
    this.viewConfig = initialState.viewConfig
    this.filter = null;
    this.update();
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
        this.filter = result;
        this.viewConfig = { ...this.viewConfig, filter: { filter: result.filter, paths: result.paths } }
        if (result.filter.expressions.length > 0 || result.paths.length > 0) this.publicationService.filter(result.filter, result.paths).subscribe({
          next: data => {
            if (data.length === 0) {
              this._snackBar.open(`Keine Publikationen gefunden`, 'Na gut...', {
                duration: 5000,
                panelClass: [`warning-snackbar`],
                verticalPosition: 'top'
              })
            } else {
              this._snackBar.open(`${data.length} Publikationen gefiltert`, 'Super!', {
                duration: 5000,
                panelClass: [`success-snackbar`],
                verticalPosition: 'top'
              });
            }
            this.publications = data;
            this.name = 'Gefilterte Publikationen';
            this.table.update(this.publications);
          },
          error: err => {
            this._snackBar.open(`Filter kann nicht angewandt werden, bitte anpassen`, 'Puh...', {
              duration: 5000,
              panelClass: [`danger-snackbar`],
              verticalPosition: 'top'
            })
          }
        });
        else {
          this._snackBar.open(`Alle Filter zurückgesetzt`, 'Super!', {
            duration: 5000,
            panelClass: [`success-snackbar`],
            verticalPosition: 'top'
          });
          this.update()
        }
      }
    });
  }

  softdeletes() {
    this._snackBar.open(`Ansicht wurde geändert`, 'Super!', {
      duration: 5000,
      panelClass: [`success-snackbar`],
      verticalPosition: 'top'
    });
    this.store.dispatch(resetViewConfig())
    this.store.dispatch(resetReportingYear())
    this.filter = null;
    this.update(true);
  }

  createLink() {
    this.store.dispatch(setViewConfig({
      viewConfig: { ...this.table.getViewConfig(), filter: this.filter }
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
    if (!this.filter) return '';
    let res = '?';
    for (let expr of this.filter.filter.expressions) {
      res += 'filter=' + expr.op + ',' + expr.key + ',' + expr.comp + ',' + expr.value + '&';
    }
    if (this.filter.filter.expressions.length > 0) res = res.slice(0, res.length - 1) + '&';
    for (let path of this.filter.paths) {
      res += 'path=' + path + '&';
    }
    if (this.filter.paths.length > 0) res = res.slice(0, res.length - 1);
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
