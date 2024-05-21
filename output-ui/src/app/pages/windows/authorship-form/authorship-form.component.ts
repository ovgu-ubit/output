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
import { PublicationService } from 'src/app/services/entities/publication.service';

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
    private publicationService:PublicationService,
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
    })));
    ob$ = merge(ob$, this.publicationService.getRoles().pipe(map(data => {
      this.roles = data;
    })));
    ob$.subscribe({
      complete: () => {
        if (this.data.authorPub) {
          this.form.get('affiliation').setValue(this.data.authorPub?.affiliation)
          this.form.get('author').setValue(this.data.authorPub?.author.last_name + ", " + this.data.authorPub?.author.first_name)
          this.role = this.data.authorPub.role? this.data.authorPub.role : this.roles[0]
          this.addAuthor(this.data.authorPub?.author)

        } else {//new authorship

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
    if (this.institute && !this.author.institutes.find(e => this.institute.id === e.id)) {
      //save institute to author
      this.author.institutes.push(this.institute);
    }
    this.author.locked_at = null;
    this.authorService.update(this.author).subscribe()
    if (!this.institute) this.dialogRef.close(null)
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
        this.dialogRef.close({author:this.author, institute:this.institute, corresponding: this.form.get('corresponding').value, role: this.role});
      });
    }
    else this.dialogRef.close({author:this.author, institute:this.institute, corresponding: this.form.get('corresponding').value, role: this.role});
  }

  abort() {
    if (this.author) {
      this.author.locked_at = null;
      this.authorService.update(this.author).subscribe();
    }
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
    this.addAuthor({ value: event.option.value })
  }

  addAuthor(event) {
    if ((!event.value && !event.id) || this.disabled) return;
    let author;
    if (event.id) {
      author = this.authors.find(e => e.id === event.id)
    } else {
      let split = event.value.toLocaleLowerCase().split(',').map(e => e.trim());
      if (split.length > 1) {
        author = this.authors.find(e => e.last_name.toLocaleLowerCase() === split[0] && e.first_name.toLocaleLowerCase() === split[1]);
      }
    }

    if (author) { //author existing
      //open institute selection dialog
    } else { // new author
      let dialogData = new ConfirmDialogModel("Autor*in anlegen", `Möchten Sie Autor*in "${event.value}" hinzufügen?`);

      let dialogRef = this.dialog.open(ConfirmDialogComponent, {
        maxWidth: "400px",
        data: dialogData
      });
      let value = event.value;

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
              author = data;
            }
          })
        }
      })
    }

    this.authorService.getAuthor(author.id).subscribe({
      next: data => {
        this.author = data;
        if (this.author.locked_at) {
          this.form.disable()
          this.disabled = true;
          this._snackBar.open('Autor*in wird leider gerade durch einen anderen Nutzer bearbeitet', 'Ok.', {
            duration: 5000,
            panelClass: [`warning-snackbar`],
            verticalPosition: 'top'
          })
        }
      }
    })
  }

}
