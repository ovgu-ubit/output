import { SelectionModel } from '@angular/cdk/collections';
import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { TableButton, TableHeader, TableParent } from 'src/app/interfaces/table';
import { TableComponent } from 'src/app/tools/table/table.component';
import { Subject, concat, concatMap, delay, map, merge, of, takeUntil } from 'rxjs';
import { AuthorService } from 'src/app/services/entities/author.service';
import { Author } from '../../../../../output-interfaces/Publication';
import { AuthorIndex } from '../../../../../output-interfaces/PublicationIndex';
import { AuthorFormComponent } from '../windows/author-form/author-form.component';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CombineDialogComponent } from 'src/app/tools/combine-dialog/combine-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';
import { Store } from '@ngrx/store';
import { resetViewConfig, selectReportingYear, setViewConfig } from 'src/app/services/redux';
import { SortDirection } from '@angular/material/sort';
import { Router } from '@angular/router';
import { PublicationService } from 'src/app/services/entities/publication.service';

@Component({
  selector: 'app-authors',
  templateUrl: './authors.component.html',
  styleUrls: ['./authors.component.css']
})
export class AuthorsComponent implements TableParent<AuthorIndex>, OnInit{
  buttons: TableButton[] = [
    { title: 'Hinzufügen', action_function: this.addAuthor.bind(this), roles: ['writer'] },
    { title: 'Löschen', action_function: this.deleteSelected.bind(this), roles: ['writer'] },
    { title: 'Zusammenführen', action_function: this.combine.bind(this), roles: ['writer'] },
  ];
  loading: boolean;
  selection: SelectionModel<any> = new SelectionModel<any>(true, []);
  destroy$ = new Subject();

  authors:AuthorIndex[] = [];
  reporting_year:number;

  @ViewChild(TableComponent) table: TableComponent<AuthorIndex>;
  headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID' },
    { colName: 'title', colTitle: 'Titel' },
    { colName: 'first_name', colTitle: 'Vorname' },
    { colName: 'last_name', colTitle: 'Nachname' },
    { colName: 'orcid', colTitle: 'ORCID' },
    { colName: 'institutes', colTitle: 'Institute' },
    { colName: 'pub_count', colTitle: 'Anzahl Publikationen' , type: 'pubs'},
    { colName: 'pub_corr_count', colTitle: 'Anzahl Publikationen (corr.)' , type: 'pubs'},
  ];

  constructor(private authorService:AuthorService, private dialog:MatDialog, private _snackBar: MatSnackBar, private store: Store, private publicationService:PublicationService,
    private router:Router) {}

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
      this.headers.find(e => e.colName === 'pub_corr_count').colTitle += ' '+data
      return this.authorService.index(data);
    })).subscribe({
      next: data => {
        this.authors = data;
        this.loading = false;
        this.table.update(this.authors);
      }
    })
  }
  
  getName() {
    return 'Autoren';
  }

  getLink() {
    return '/authors'
  }

  getLabel() {
    return '/Autoren'
  }
  
  update(): void {
    this.loading = true;
    this.authorService.index(this.reporting_year).subscribe({
      next: data => {
        this.authors = data;
        this.loading = false;
        this.table.update(this.authors);
      }
    })
  }
  edit(row: any): void {
    let dialogRef = this.dialog.open(AuthorFormComponent, {
      width: '800px',
      maxHeight: '800px',
      data: {
        author: {id: row.id}
      },
      disableClose: true
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.authorService.update(result).subscribe({
          next: data => {
            this._snackBar.open(`Autor*in geändert`, 'Super!', {
              duration: 5000,
              panelClass: [`success-snackbar`],
              verticalPosition: 'top'
            })
            this.update();
          }, error: err => {
            this._snackBar.open(`Fehler beim Ändern der*s Autor*in`, 'Oh oh!', {
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
      this._snackBar.open(`Bitte selektieren Sie min. zwei Autoren`, 'Alles klar!', {
        duration: 5000,
        panelClass: [`warning-snackbar`],
        verticalPosition: 'top'
      })
    } else {
      //selection dialog
      let dialogRef = this.dialog.open(CombineDialogComponent<Author>, {
        width: '800px',
        maxHeight: '800px',
        data: {
          ents: this.selection.selected
        },
        disableClose: true
      });
      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.authorService.combine(result.id, this.selection.selected.filter(e => e.id !== result.id).map(e => e.id)).subscribe({
            next: data => {
              this._snackBar.open(`Autoren wurden zusammengeführt`, 'Super!', {
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

  addAuthor() {
    let dialogRef = this.dialog.open(AuthorFormComponent, {
      width: '800px',
      maxHeight: '800px',
      data: {
        autor: {
          
        }
      },
      disableClose: true
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.authorService.addAuthor(result).subscribe({
          next: data => {
            this._snackBar.open(`Autor*in wurde angelegt`, 'Super!', {
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
    let dialogData = new ConfirmDialogModel(this.selection.selected.length + " Autor*innen löschen", `Möchten Sie ${this.selection.selected.length} Autor*innen löschen, dies kann nicht rückgängig gemacht werden?`);

    let dialogRef = this.dialog.open(ConfirmDialogComponent, {
      maxWidth: "400px",
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(dialogResult => {
      if (dialogResult) {
        this.authorService.delete(this.selection.selected).subscribe({
          next: data => {
            this._snackBar.open(`${data['affected']} Autor*innen gelöscht`, 'Super!', {
              duration: 5000,
              panelClass: [`success-snackbar`],
              verticalPosition: 'top'
            })
            this.update();
          }, error: err => {
            this._snackBar.open(`Fehler beim Löschen der Autor*innen`, 'Oh oh!', {
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
    if (field === 'pub_count') res = await this.publicationService.filterAuthor(id)
    else res = await this.publicationService.filterAuthorCorr(id)
    let viewConfig = {
      sortDir: 'asc' as SortDirection,
      filteredIDs: res
    }
    this.store.dispatch(setViewConfig({viewConfig}))
    this.router.navigateByUrl('publications')
  }
}
