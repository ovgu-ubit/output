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
import { resetViewConfig, selectReportingYear, setViewConfig } from 'src/app/services/redux';
import { SortDirection } from '@angular/material/sort';
import { Store } from '@ngrx/store';
import { Router } from '@angular/router';
import { InstituteService } from 'src/app/services/entities/institute.service';
import { PublicationService } from 'src/app/services/entities/publication.service';

@Component({
  selector: 'app-institutions',
  templateUrl: './institutions.component.html',
  styleUrls: ['./institutions.component.css']
})
export class InstitutionsComponent implements TableParent<Institute>, OnInit{
  buttons: TableButton[] = [
    { title: 'Hinzufügen', action_function: this.add.bind(this), roles: ['writer'] },
    { title: 'Löschen', action_function: this.deleteSelected.bind(this), roles: ['writer'] },
    { title: 'Zusammenführen', action_function: this.combine.bind(this), roles: ['writer'] },
  ];
  loading: boolean = true;
  selection: SelectionModel<InstituteIndex> = new SelectionModel<InstituteIndex>(true, []);
  destroy$ = new Subject();

  institutes:InstituteIndex[] = [];

  reporting_year;

  @ViewChild(TableComponent) table: TableComponent<InstituteIndex>;
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

  constructor(private instService:InstituteService, private dialog:MatDialog, private _snackBar: MatSnackBar, private publicationService:PublicationService,
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
      }
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
  edit(row: any): void {
    let dialogRef = this.dialog.open(InstituteFormComponent, {
      width: '800px',
      maxHeight: '800px',
      data: {
        institute: {id: row.id}
      },
      disableClose: true
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.label) {
        this.instService.update(result).subscribe({
          next: data => {
            this._snackBar.open(`Institut geändert`, 'Super!', {
              duration: 5000,
              panelClass: [`success-snackbar`],
              verticalPosition: 'top'
            })
            this.update();
          }, error: err => {
            this._snackBar.open(`Fehler beim Ändern des Instituts`, 'Oh oh!', {
              duration: 5000,
              panelClass: [`danger-snackbar`],
              verticalPosition: 'top'
            })
            console.log(err);
          }
        })
      } else if (result && result.id) {
        this.instService.update(result).subscribe();
      }

    });
  }

  combine() {
    if (this.selection.selected.length < 2) {
      this._snackBar.open(`Bitte selektieren Sie min. zwei Institute`, 'Alles klar!', {
        duration: 5000,
        panelClass: [`warning-snackbar`],
        verticalPosition: 'top'
      })
    } else {
      //selection dialog
      let dialogRef = this.dialog.open(CombineDialogComponent<Institute>, {
        width: '800px',
        maxHeight: '800px',
        data: {
          ents: this.selection.selected,
          aliases: true
        },
        disableClose: true
      });
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.instService.combine(result.id, this.selection.selected.filter(e => e.id !== result.id).map(e => e.id), result.aliases).subscribe({
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
    let dialogRef = this.dialog.open(InstituteFormComponent, {
      width: '800px',
      maxHeight: '800px',
      data: {
        institute: {
          
        }
      },
      disableClose: true
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.instService.addInstitute(result).subscribe({
          next: data => {
            this._snackBar.open(`Institut wurde angelegt`, 'Super!', {
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
    let dialogData = new ConfirmDialogModel(this.selection.selected.length + " Institute löschen", `Möchten Sie ${this.selection.selected.length} Institute löschen, dies kann nicht rückgängig gemacht werden?`);

    let dialogRef = this.dialog.open(ConfirmDialogComponent, {
      maxWidth: "400px",
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(dialogResult => {
      if (dialogResult) {
        this.instService.delete(this.selection.selected).subscribe({
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
    //identify sub_institutes
    let ids = await firstValueFrom(this.instService.getSubInstitutes(id));
    ids.push(id);
    this.store.dispatch(resetViewConfig());
    let res = [];
    if (field === 'pub_count') res = await this.publicationService.filterInst(ids)
    else res = await this.publicationService.filterInstCorr(ids)
    let viewConfig = {
      sortDir: 'asc' as SortDirection,
      filteredIDs: res
    }
    this.store.dispatch(setViewConfig({viewConfig}))
    this.router.navigateByUrl('publications')
  }
}
