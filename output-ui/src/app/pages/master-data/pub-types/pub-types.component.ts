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
import { resetViewConfig, selectReportingYear, setViewConfig } from 'src/app/services/redux';
import { SortDirection } from '@angular/material/sort';

@Component({
  selector: 'app-pub-types',
  templateUrl: './pub-types.component.html',
  styleUrls: ['./pub-types.component.css']
})
export class PubTypesComponent implements TableParent<PublicationTypeIndex>, OnInit{
  buttons: TableButton[] = [
    { title: 'Hinzufügen', action_function: this.add.bind(this), roles: ['writer'] },
    { title: 'Löschen', action_function: this.deleteSelected.bind(this), roles: ['writer'] },
    { title: 'Zusammenführen', action_function: this.combine.bind(this), roles: ['writer'] },
  ];
  loading: boolean = true;
  selection: SelectionModel<any> = new SelectionModel<any>(true, []);
  destroy$ = new Subject();

  pub_types:PublicationTypeIndex[] = [];

  @ViewChild(TableComponent) table: TableComponent<PublicationTypeIndex>;
  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID' },
    { colName: 'label', colTitle: 'Bezeichnung' },
    { colName: 'review', colTitle: 'Begutachtet?', type:'boolean' },
    { colName: 'pub_count', colTitle: 'Anzahl Publikationen', type:'pubs' },
  ];
  reporting_year;

  constructor(private pubTypeService:PublicationTypeService, private dialog:MatDialog, private _snackBar: MatSnackBar, private publicationService:PublicationService,
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
      }
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
  
  update(): void {
    this.loading = true;
    this.pubTypeService.index(this.reporting_year).subscribe({
      next: data => {
        this.pub_types = data;
        this.loading = false;
        this.table?.update(this.pub_types);
      }
    })
  }
  edit(row: any): void {
    let dialogRef = this.dialog.open(PubTypeFormComponent, {
      width: '800px',
      maxHeight: '800px',
      data: {
        pub_type: {id: row.id}
      },
      disableClose: true
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.pubTypeService.update(result).subscribe({
          next: data => {
            this._snackBar.open(`Publikationsart geändert`, 'Super!', {
              duration: 5000,
              panelClass: [`success-snackbar`],
              verticalPosition: 'top'
            })
            this.update();
          }, error: err => {
            this._snackBar.open(`Fehler beim Ändern der Publikationsart`, 'Oh oh!', {
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

  combine() {
    if (this.selection.selected.length < 2) {
      this._snackBar.open(`Bitte selektieren Sie min. zwei Publikationsarten`, 'Alles klar!', {
        duration: 5000,
        panelClass: [`warning-snackbar`],
        verticalPosition: 'top'
      })
    } else {
      //selection dialog
      let dialogRef = this.dialog.open(CombineDialogComponent<PublicationTypeIndex>, {
        width: '800px',
        maxHeight: '800px',
        data: {
          ents: this.selection.selected
        },
        disableClose: true
      });
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.pubTypeService.combine(result.id, this.selection.selected.filter(e => e.id !== result.id).map(e => e.id)).subscribe({
            next: data => {
              this._snackBar.open(`Publikationsarten wurden zusammengeführt`, 'Super!', {
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
    let dialogRef = this.dialog.open(PubTypeFormComponent, {
      width: '800px',
      maxHeight: '800px',
      data: {
        pub_type: {
          
        }
      },
      disableClose: true
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.pubTypeService.insert(result).subscribe({
          next: data => {
            this._snackBar.open(`Publikationsart wurde angelegt`, 'Super!', {
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
    let dialogData = new ConfirmDialogModel(this.selection.selected.length + " Publikationsarten löschen", `Möchten Sie ${this.selection.selected.length} Publikationsarten löschen, dies kann nicht rückgängig gemacht werden?`);

    let dialogRef = this.dialog.open(ConfirmDialogComponent, {
      maxWidth: "400px",
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(dialogResult => {
      if (dialogResult) {
        this.pubTypeService.delete(this.selection.selected).subscribe({
          next: data => {
            this._snackBar.open(`${data['affected']} Publikationsarten gelöscht`, 'Super!', {
              duration: 5000,
              panelClass: [`success-snackbar`],
              verticalPosition: 'top'
            })
            this.update();
          }, error: err => {
            this._snackBar.open(`Fehler beim Löschen der Publikationsarten`, 'Oh oh!', {
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
    let res = [];
    res = await this.publicationService.filterPubType(id)
    let viewConfig = {
      sortDir: 'asc' as SortDirection,
      filteredIDs: res
    }
    this.store.dispatch(setViewConfig({viewConfig}))
    this.router.navigateByUrl('publications')
  }
}
