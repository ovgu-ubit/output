import { Component, OnInit, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, map, merge, startWith } from 'rxjs';
import { AuthorService } from 'src/app/services/entities/author.service';
import { InstituteService } from 'src/app/services/entities/institute.service';
import { Author, Institute, Role } from '../../../../../../output-interfaces/Publication';
import { AliasFormComponent } from 'src/app/tools/alias-form/alias-form.component';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';
import { RoleService } from 'src/app/services/entities/role.service';
import { AuthorFormComponent } from '../author-form/author-form.component';

@Component({
  selector: 'app-authorship-form',
  templateUrl: './authorship-form.component.html',
  styleUrls: ['./authorship-form.component.css']
})
export class AuthorshipFormComponent implements OnInit {

  author: Author;
  institute: Institute = this.data.authorPub?.institute;

  institutes: Institute[];
  filtered_institutes: Observable<Institute[]>;

  authors: Author[];
  filteredAuthors: Observable<Author[]>;

  role: Role;
  roles: Role[];

  constructor(public dialogRef: MatDialogRef<AuthorshipFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any, private formBuilder: FormBuilder, private authorService: AuthorService, private instService: InstituteService,
    private roleService: RoleService,
    private _snackBar: MatSnackBar, private dialog: MatDialog) { }

  form = this.formBuilder.group({
    author: ['', [Validators.required]],
    affiliation: [''],
    institute: [''],
    inst: [''],
    corresponding: [''],
    role: ['']
  })
  disabled = false;

  ngOnInit(): void {
    let ob$ = this.instService.getinstitutes().pipe(map(data => {
      this.institutes = data.sort((a, b) => a.label.localeCompare(b.label));
      this.filtered_institutes = this.form.get('inst').valueChanges.pipe(
        startWith(''),
        map(value => this._filterInst(value || '')),
      );
    }))
    ob$ = merge(ob$, this.authorService.getAuthors().pipe(map(data => {
      this.authors = data.sort((a, b) => (a.last_name + ', ' + a.first_name).localeCompare(b.last_name + ', ' + b.first_name));
      if (this.data.authors) this.authors = this.authors.filter(e => !this.data.authors.find(f => f === e.id))
    })));
    ob$ = merge(ob$, this.roleService.getRoles().pipe(map(data => {
      this.roles = data;
    })));
    ob$.subscribe({
      complete: () => {
        if (this.data.authorPub) {
          this.form.get('affiliation').setValue(this.data.authorPub?.affiliation)
          this.form.get('author').setValue(this.data.authorPub?.author.last_name + ", " + this.data.authorPub?.author.first_name)
          this.form.get('corresponding').setValue(this.data.authorPub?.corresponding)
          this.role = this.data.authorPub.role ? this.data.authorPub.role : this.roles[0]
          this.author = this.authors.find(e => e.id === this.data.authorPub.authorId)
        } else {//new authorship
          this.role = this.roles[0]
        }
        this.filteredAuthors = this.form.get('author').valueChanges.pipe(
          startWith(this.form.get('author').value),
          //map(value => typeof value === 'string' ? value : value.name),
          map((name) => {
            return name ? this._filter(name) : this.authors;
          }));
      }
    })

  }

  compare(i1, i2) {
    return (i1?.id === i2?.id)
  }

  action() {
    if (!this.author) return;
    if (this.institute && !this.author.institutes.find(e => this.institute.id === e.id)) {
      //save institute to author
      this.author.institutes.push(this.institute);
      this.authorService.update(this.author).subscribe()
    }
    if (this.form.get('affiliation').value && this.institute && !this.institute.aliases?.find(e => this.form.get('affiliation').value.includes(e.alias))) {
      //open alias dialog
      let aliases = [this.form.get('affiliation').value];

      let dialogRef = this.dialog.open(AliasFormComponent, {
        width: '400px',
        data: {
          aliases
        },
        disableClose: true
      });
      dialogRef.afterClosed().subscribe(result => {
        let inst = this.institute;
        if (result && result.length > 0) {
          inst = this.institutes.find(e => e.id === this.institute.id)
          inst.aliases.push({ elementId: this.institute.id, alias: result[0] });
          this.instService.update(inst).subscribe()
        }
        this.dialogRef.close({ author: this.author, authorId: this.author.id, institute: this.institute, corresponding: this.form.get('corresponding').value, role: this.role, affiliation: this.form.get('affiliation').value });
      });
    }
    else this.dialogRef.close({ author: this.author, authorId: this.author.id, institute: this.institute, corresponding: this.form.get('corresponding').value, role: this.role, affiliation: this.form.get('affiliation').value });
  }

  abort() {
    this.dialogRef.close({});
  }

  selectedInst(event: MatAutocompleteSelectedEvent): void {
    this.addInst(event.option)
  }

  addInst(event) {
    let inst = this.institutes.find(e => e.label.trim().toLowerCase() === event.value.trim().toLowerCase());
    this.institute = inst;
    this.form.get('inst').setValue(this.institute.label);
  }

  private _filterInst(value: string): Institute[] {
    const filterValue = value.toLowerCase();

    return this.institutes.filter(pub => pub?.label.toLowerCase().includes(filterValue) || pub?.short_label?.toLowerCase().includes(filterValue));
  }

  private _filter(value) {
    let filterValue = value.toLowerCase();
    let split = filterValue.split(',').map(e => e.trim());
    if (split.length === 1) {
      return this.authors.filter(author => author.last_name.toLowerCase().includes(filterValue) ||
        (author.orcid && author.orcid.includes(filterValue)));
    } else return this.authors.filter(author => author.last_name.toLowerCase() === split[0] && author.first_name.toLowerCase().includes(split[1]));
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    this.author = this.authors.find(e => e.id === event.option.value);
    this.form.get('author').setValue(event.option.viewValue)
  }

  addAuthor() {
    if (this.disabled) return;
    let author;
    if (!this.author || this.form.get("author").value !== this.author.last_name + ", " + this.author.first_name) {
      let split = this.form.get("author").value.toLocaleLowerCase().split(',').map(e => e.trim());
      if (split.length > 1) {
        author = this.authors.find(e => e.last_name.toLocaleLowerCase() === split[0] && e.first_name.toLocaleLowerCase() === split[1]);
      }
    } else author = this.author;

    if (author) { //author existing
      let dialogRef = this.dialog.open(AuthorFormComponent, {
        width: "400px",
        data: {
          author
        }
      });
      dialogRef.afterClosed().subscribe(dialogResult => {
        if (dialogResult && dialogResult.last_name) {
          this.authorService.update(dialogResult).subscribe({
            next: data => {
              this._snackBar.open('Person wurde geändert', 'Super!', {
                duration: 5000,
                panelClass: [`success-snackbar`],
                verticalPosition: 'top'
              })
              this.author = data[0];
            }
          })
        } else if (dialogResult && dialogResult.id) {
          this.authorService.update(dialogResult).subscribe();
        }
      });

    } else { // new author
      let value = this.form.get('author').value;
      let dialogData = new ConfirmDialogModel("Autor*in anlegen", `Möchten Sie Autor*in "${value}" hinzufügen?`);

      let dialogRef = this.dialog.open(ConfirmDialogComponent, {
        maxWidth: "400px",
        data: dialogData
      });


      dialogRef.afterClosed().subscribe(dialogResult => {
        if (dialogResult) {
          this.authorService.addAuthor({ last_name: value.split(',')[0].trim(), first_name: value.split(',')[1].trim() }).subscribe({
            next: data => {
              this._snackBar.open('Autor*in wurde hinzugefügt', 'Super!', {
                duration: 5000,
                panelClass: [`success-snackbar`],
                verticalPosition: 'top'
              })
              this.form.get('author').setValue(data.last_name + ", " + data.first_name)
              this.author = data;
              this.authorService.getAuthors().subscribe({
                next: data => {
                  this.authors = data.sort((a, b) => (a.last_name + ', ' + a.first_name).localeCompare(b.last_name + ', ' + b.first_name));
                  if (this.data.authors) this.authors = this.authors.filter(e => !this.data.authors.find(f => f === e.id))
                }
              });
            }
          })
        }
      })
    }
  }
}
