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
import { resetViewConfig, selectReportingYear, setViewConfig } from 'src/app/services/redux';
import { SortDirection } from '@angular/material/sort';

@Component({
  selector: 'app-funders',
  templateUrl: './funders.component.html',
  styleUrls: ['./funders.component.css']
})
export class FundersComponent implements TableParent<FunderIndex>, OnInit{
  buttons: TableButton[] = [
    { title: 'Hinzufügen', action_function: this.add.bind(this), roles: ['writer'] },
    { title: 'Löschen', action_function: this.deleteSelected.bind(this), roles: ['writer'] },
    { title: 'Zusammenführen', action_function: this.combine.bind(this), roles: ['writer'] },
  ];
  loading: boolean = true;
  selection: SelectionModel<any> = new SelectionModel<any>(true, []);
  destroy$ = new Subject();

  funders:FunderIndex[] = [];

  @ViewChild(TableComponent) table: TableComponent<FunderIndex>;
  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'label', colTitle: 'Bezeichnung' },
    { colName: 'doi', colTitle: 'DOI', type:'doi' },
    { colName: 'pub_count', colTitle: 'Anzahl Publikationen', type:'pubs' },
  ];
  reporting_year;

  constructor(private funderService:FunderService, private dialog:MatDialog, private _snackBar: MatSnackBar, private publicationService:PublicationService,
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
      }
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
  edit(row: any): void {
    let dialogRef = this.dialog.open(FunderFormComponent, {
      width: '800px',
      maxHeight: '800px',
      data: {
        funder: {id: row.id}
      },
      disableClose: true
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.label) {
        this.funderService.update(result).subscribe({
          next: data => {
            this._snackBar.open(`Förderer geändert`, 'Super!', {
              duration: 5000,
              panelClass: [`success-snackbar`],
              verticalPosition: 'top'
            })
            this.update();
          }, error: err => {
            this._snackBar.open(`Fehler beim Ändern des Förderers`, 'Oh oh!', {
              duration: 5000,
              panelClass: [`danger-snackbar`],
              verticalPosition: 'top'
            })
            console.log(err);
          }
        })
      } else if (result && result.id) {
        this.funderService.update(result).subscribe();
      }
    });
  }

  combine() {
    if (this.selection.selected.length < 2) {
      this._snackBar.open(`Bitte selektieren Sie min. zwei Förderer`, 'Alles klar!', {
        duration: 5000,
        panelClass: [`warning-snackbar`],
        verticalPosition: 'top'
      })
    } else {
      //selection dialog
      let dialogRef = this.dialog.open(CombineDialogComponent<FunderIndex>, {
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
          this.funderService.combine(result.id, this.selection.selected.filter(e => e.id !== result.id).map(e => e.id), result.aliases).subscribe({
            next: data => {
              this._snackBar.open(`Förderer wurden zusammengeführt`, 'Super!', {
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
    let dialogRef = this.dialog.open(FunderFormComponent, {
      width: '800px',
      maxHeight: '800px',
      data: {
        funder: {
          
        }
      },
      disableClose: true
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.funderService.insert(result).subscribe({
          next: data => {
            this._snackBar.open(`Förderer wurde angelegt`, 'Super!', {
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
    let dialogData = new ConfirmDialogModel(this.selection.selected.length + " Förderer löschen", `Möchten Sie ${this.selection.selected.length} Förderer löschen, dies kann nicht rückgängig gemacht werden?`);

    let dialogRef = this.dialog.open(ConfirmDialogComponent, {
      maxWidth: "400px",
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(dialogResult => {
      if (dialogResult) {
        this.funderService.delete(this.selection.selected).subscribe({
          next: data => {
            this._snackBar.open(`${data['affected']} Förderer gelöscht`, 'Super!', {
              duration: 5000,
              panelClass: [`success-snackbar`],
              verticalPosition: 'top'
            })
            this.update();
          }, error: err => {
            this._snackBar.open(`Fehler beim Löschen der Förderer`, 'Oh oh!', {
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
    res = await this.publicationService.filterFunder(id)
    let viewConfig = {
      sortDir: 'asc' as SortDirection,
      filteredIDs: res
    }
    this.store.dispatch(setViewConfig({viewConfig}))
    this.router.navigateByUrl('publications')
  }
}
