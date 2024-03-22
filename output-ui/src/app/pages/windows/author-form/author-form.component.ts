import { AfterViewInit, Component, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { Observable, map, startWith } from 'rxjs';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { AuthorService } from 'src/app/services/entities/author.service';
import { InstituteService } from 'src/app/services/entities/institute.service';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';
import { Author, Institute } from '../../../../../../output-interfaces/Publication';
import { InstituteFormComponent } from '../institute-form/institute-form.component';

@Component({
  selector: 'app-author-form',
  templateUrl: './author-form.component.html',
  styleUrls: ['./author-form.component.css']
})
export class AuthorFormComponent implements OnInit, AfterViewInit {

  public form: FormGroup;

  author: Author;
  institutes: Institute[];
  filtered_institutes: Observable<Institute[]>;
  displayedColumns: string[] = ['id', 'label', 'short_label', 'delete'];
  disabled = false;

  @ViewChild(MatTable) table: MatTable<Institute>;

  constructor(public dialogRef: MatDialogRef<AuthorFormComponent>, public tokenService: AuthorizationService,
    @Inject(MAT_DIALOG_DATA) public data: any, private formBuilder: FormBuilder, private authorService: AuthorService, private instService: InstituteService,
    private dialog: MatDialog, private _snackBar: MatSnackBar) { }


  ngOnInit(): void {
    if (this.data.author?.id) {
      this.authorService.getAuthor(this.data.author.id).subscribe({
        next: data => {
          this.author = data;
          this.form.patchValue(this.author)
          if (this.author.locked_at) {
            this.disable();
            this._snackBar.open('Autor*in wird leider gerade durch einen anderen Nutzer bearbeitet', 'Ok.', {
              duration: 5000,
              panelClass: [`warning-snackbar`],
              verticalPosition: 'top'
            })
          }
        }
      })
    }
    else this.author = {
      first_name: this.data.author?.first_name,
      last_name: this.data.author?.last_name
    }
    this.instService.getinstitutes().subscribe({
      next: data => {
        this.institutes = data.sort((a, b) => a.label.localeCompare(b.label));;
        this.filtered_institutes = this.form.get('inst').valueChanges.pipe(
          startWith(''),
          map(value => this._filterInst(value || '')),
        );
      }
    })

    this.form = this.formBuilder.group({
      id: [''],
      title: [''],
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      orcid: ['', Validators.pattern(/^(\d{4}-){3}\d{3}(\d|X)$/)],
      gnd_id: ['', Validators.pattern(/^[0-9X-]*$/)],
      inst: ['']
    });
    this.form.controls.id.disable();
    this.form.patchValue(this.author)
  }

  ngAfterViewInit(): void {
    if (!this.tokenService.hasRole('writer') && !this.tokenService.hasRole('admin')) {
      this.disable();
    }
  }

  disable() {
    this.disabled = true;
    this.form.disable();
  }

  action() {
    if (this.form.invalid) return;
    this.author = { ...this.author, ...this.form.getRawValue() }
    if (!this.author.id) this.author.id = undefined;
    this.dialogRef.close(this.author)
  }

  close() {
    this.dialogRef.close(null)
  }

  abort() {
    if (this.form.dirty) {
      let dialogData = new ConfirmDialogModel("Ungesicherte Änderungen", `Es gibt ungespeicherte Änderungen, möchten Sie diese zunächst speichern?`);

      let dialogRef = this.dialog.open(ConfirmDialogComponent, {
        maxWidth: "400px",
        data: dialogData
      });

      dialogRef.afterClosed().subscribe(dialogResult => {
        if (dialogResult) { //save
          this.action();
        } else if (this.author.id) this.dialogRef.close({ id: this.author.id, locked_at: null })
        else this.close()
      });
    } else if (this.author.id) this.dialogRef.close({ id: this.author.id, locked_at: null })
    else this.close()
  }

  deleteInst(row) {
    if (this.disabled) return;
    this.author.institutes = this.author.institutes.filter(e => e.id !== row.id)
  }

  addInst(event) {
    if (!event.value || this.disabled) return;
    if (!this.institutes.find(e => e.label === event.value)) {
      //new institute
      let dialogData = new ConfirmDialogModel("Neues Institut", `Möchten Sie das Institut "${event.value}" anlegen?`);
      let value = event.value;
      let dialogRef = this.dialog.open(ConfirmDialogComponent, {
        maxWidth: "400px",
        data: dialogData
      });
      dialogRef.afterClosed().subscribe(dialogResult => {
        if (dialogResult) {
          let dialogRef1 = this.dialog.open(InstituteFormComponent, {
            width: "400px",
            data: {
              institute: {
                label: value
              }
            }
          });
          dialogRef1.afterClosed().subscribe(dialogResult => {
            if (dialogResult) {
              this.instService.addInstitute(dialogResult).subscribe({
                next: data => {
                  this._snackBar.open('Institut wurde hinzugefügt', 'Super!', {
                    duration: 5000,
                    panelClass: [`success-snackbar`],
                    verticalPosition: 'top'
                  })
                  if (!this.author.institutes) this.author.institutes = [];
                  this.author.institutes = this.author.institutes.concat(data)
                }
              })
            }
          });
        }
      });
    } else {
      //existing institute
      if (!this.author.institutes) this.author.institutes = [];
      this.author.institutes.push(this.institutes.find(e => e.label === event.value))
    }
    this.form.get('inst').reset();
    this.table.dataSource = new MatTableDataSource<Institute>(this.author.institutes);
  }

  selectedInst(event: MatAutocompleteSelectedEvent): void {
    this.addInst(event.option);
  }

  private _filterInst(value: string): Institute[] {
    const filterValue = value.toLowerCase();

    return this.institutes.filter(inst => inst?.label.toLowerCase().includes(filterValue) || inst?.short_label?.toLowerCase().includes(filterValue));
  }

  enter(event) {
    if (event.keyCode == 13 && event.srcElement.localName !== 'textarea') return false;
    return true;
  }

  escape(event) {
    if (event.key === 'Escape') {
      this.abort();
      return false;
    }
    return true;
  }
}

