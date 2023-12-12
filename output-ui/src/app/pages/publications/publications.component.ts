import { SelectionModel } from '@angular/cdk/collections';
import { Location } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SortDirection } from '@angular/material/sort';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, Subject, concatMap, map, of, takeUntil } from 'rxjs';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { EnrichService } from 'src/app/services/enrich.service';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { initialState, resetReportingYear, resetViewConfig, selectReportingYear, selectViewConfig, setReportingYear, setViewConfig } from 'src/app/services/redux';
import { CombineDialogComponent } from 'src/app/tools/combine-dialog/combine-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';
import { TableComponent } from 'src/app/tools/table/table.component';
import { environment } from 'src/environments/environment';
import { Publication } from '../../../../../output-interfaces/Publication';
import { PublicationIndex } from '../../../../../output-interfaces/PublicationIndex';
import { FilterViewComponent } from '../windows/filter-view/filter-view.component';
import { PublicationFormComponent } from '../windows/publication-form/publication-form.component';
import { ReportingYearFormComponent } from '../windows/reporting-year-form/reporting-year-form.component';

@Component({
  selector: 'app-publications',
  templateUrl: './publications.component.html',
  styleUrls: ['./publications.component.css']
})
export class PublicationsComponent implements OnInit, OnDestroy, TableParent<PublicationIndex> {
  constructor(private publicationService: PublicationService, public dialog: MatDialog, private route: ActivatedRoute,
    private location: Location, private router: Router, private _snackBar: MatSnackBar, private store: Store, private enrichService:EnrichService) { }


  reporting_year: number;
  filteredIDs: number[];

  buttons: TableButton[] = [
    {
      title: 'Anzeigeoptionen', action_function: () => { }, sub_buttons: [
        { title: 'Berichtsjahr ändern', action_function: this.changeReportingYear.bind(this) },
        { title: 'Erweiterte Filter', action_function: this.extendedFilters.bind(this) },
        { title: 'Ansicht zurücksetzen', action_function: this.resetView.bind(this) }
      ]
    },
    { title: 'Sperren', action_function: this.lockSelected.bind(this), roles: ['writer'] },
    { title: 'Hinzufügen', action_function: this.addPublication.bind(this), roles: ['writer'] },
    { title: 'Löschen', action_function: this.deleteSelected.bind(this), roles: ['writer'] },
    {
      title: 'Anreichern mit', action_function: () => { }, sub_buttons: [
        { title: 'Unpaywall', action_function: this.enrichUnpaywall.bind(this) },
        { title: 'Crossref', action_function: this.enrichCrossref.bind(this) }
      ], roles: ['writer']
    },
    { title: 'Zusammenführen', action_function: this.combine.bind(this), roles: ['writer'] },
  ];
  loading: boolean;
  selection: SelectionModel<any> = new SelectionModel<PublicationIndex>(true, []);

  destroy$ = new Subject();

  @ViewChild(TableComponent) table: TableComponent<PublicationIndex>;
  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID'},
    { colName: 'title', colTitle: 'Titel' },
    { colName: 'doi', colTitle: 'DOI', type: 'doi' },
    { colName: 'authors', colTitle: 'Autoren' },
    { colName: 'authors_inst', colTitle: 'Autoren '+environment.institution, type: 'authors' },
    { colName: 'corr_inst', colTitle: 'Corr. Institut' },
    { colName: 'greater_entity', colTitle: 'Größere Einheit' },
    { colName: 'oa_category', colTitle: 'OA-Kategorie' },
    { colName: 'edit_date', colTitle: 'Zul. geändert', type: 'datetime' },
    { colName: 'import_date', colTitle: 'Hinzugefügt', type: 'datetime' },
  ];

  publications: PublicationIndex[] = [];

  ngOnInit(): void {
    this.loading = true;
    let ob$: Observable<any> = this.store.select(selectReportingYear).pipe(concatMap(data => {
      if (data) {
        return of(data);
      } else {
        return this.publicationService.getDefaultReportingYear();
      }
    }))
    ob$ = ob$.pipe(concatMap(data => {
      this.reporting_year = data
      return this.publicationService.index(this.reporting_year).pipe(map(data => {
        this.publications = data;
        this.table.update(this.publications);
        this.loading = false;
      }));
    }));
    ob$ = ob$.pipe(concatMap(data => {
      return this.store.select(selectViewConfig).pipe(map(viewConfig => {
        this.table?.setViewConfig(viewConfig)
      }))
    }));
    ob$ = ob$.pipe(concatMap(data => {
      return this.route.queryParams.pipe(map(params => {
        if (params.id) {
          let row = this.publications.find(e => e.id == params.id)
          this.edit(row);
        }
      }));
    }));

    ob$.pipe(takeUntil(this.destroy$)).subscribe({
      next: data => {

      }, error: err => {
        console.log(err);
      }
    })
    window.onbeforeunload = () => this.ngOnDestroy();
  }

  ngOnDestroy(): void {
    this.store.dispatch(setViewConfig({
      viewConfig: (this.table.getViewConfig())
    }))
    this.destroy$.next('');
  }

  update(): void {
    this.loading = true;
    this.publicationService.index(this.reporting_year).subscribe({
      next: data => {
        this.loading = false;
        this.publications = data;
        this.table.update(this.publications);
      }, error: err => console.log(err)
    })
  }

  edit(row: any) {
    this.location.replaceState(this.router.url.split('?')[0], 'id=' + row.id)
    let dialogRef = this.dialog.open(PublicationFormComponent, {
      width: '800px',
      maxHeight: '800px',
      data: {
        id: row.id
      },
      disableClose: true
    });
    dialogRef.afterClosed().subscribe(result => {
      this.location.replaceState(this.router.url.split('?')[0])
      if (result) {
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
    //TODO: soft delete option
    if (this.selection.selected.length === 0) return;
    let dialogData = new ConfirmDialogModel(this.selection.selected.length + " Publikationen löschen", `Möchten Sie ${this.selection.selected.length} Publikationen löschen, dies kann nicht rückgängig gemacht werden?`);

    let dialogRef = this.dialog.open(ConfirmDialogComponent, {
      maxWidth: "400px",
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(dialogResult => {
      if (dialogResult) {
        this.publicationService.delete(this.selection.selected.map(e => { return { id: e.id } })).subscribe({
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

  enrichUnpaywall() {
    if (this.selection.selected.length === 0) return;
    let save = []
    for (let pub of this.selection.selected) {
      if (!pub.locked) save.push(pub.id);
    }
    this.enrichService.startID('unpaywall', save).subscribe({
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

  enrichCrossref() {
    if (this.selection.selected.length === 0) return;
    let save = []
    for (let pub of this.selection.selected) {
      if (!pub.locked) save.push(pub.id);
    }
    this.enrichService.startID('crossref', save).subscribe({
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
    this.filteredIDs = [];
    this.update();
  }

  extendedFilters() {
    let dialogRef = this.dialog.open(FilterViewComponent, {
      width: '800px',
      maxHeight: '800px',
      data: {
        yop: this.reporting_year
      },
      disableClose: false
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (result.length === 0) {
          this._snackBar.open(`Keine Publikationen gefunden`, 'Na gut...', {
            duration: 5000,
            panelClass: [`warning-snackbar`],
            verticalPosition: 'top'
          })
        } else {
          this._snackBar.open(`${result.length} Publikationen gefiltert`, 'Super!', {
            duration: 5000,
            panelClass: [`success-snackbar`],
            verticalPosition: 'top'
          });
        }
        //this.filteredIDs = result;
        this.store.dispatch(resetViewConfig());
        let viewConfig = {
          sortDir: 'asc' as SortDirection,
          filteredIDs: result
        }
        this.store.dispatch(setViewConfig({viewConfig}))
        this.table?.setViewConfig(viewConfig)
      } else {
        //this.filteredIDs = [];
        this.store.dispatch(resetViewConfig());
        this.table?.setViewConfig(initialState.viewConfig)
      }
    });
  }


  getName() {
    return 'Publikationen des Jahres ' + this.reporting_year;
  }

  getLink() {
    return '/publications'
  }

  getLabel() {
    return '/Publikationen'
  }

}
