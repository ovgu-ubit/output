import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AuthorService } from 'src/app/services/entities/author.service';
import { Author, Institute } from '../../../../../output-interfaces/Publication';
import { Observable, map, startWith } from 'rxjs';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { InstituteService } from 'src/app/services/entities/institute.service';
import { AliasFormComponent } from '../alias-form/alias-form.component';

@Component({
  selector: 'app-select-institute-dialog',
  templateUrl: './select-institute-dialog.component.html',
  styleUrls: ['./select-institute-dialog.component.css']
})
export class SelectInstituteDialogComponent implements OnInit{

  author:Author;
  institute:Institute = this.data.authorPub?.institute;
  
  institutes: Institute[];
  filtered_institutes: Observable<Institute[]>;

constructor(public dialogRef: MatDialogRef<SelectInstituteDialogComponent>,
  @Inject(MAT_DIALOG_DATA) public data: any, private formBuilder: FormBuilder, private authorService:AuthorService, private instService:InstituteService,
  private dialog: MatDialog) {}

  form = this.formBuilder.group({
    affiliation: [''],
    institute: [''],
    inst: ['']
  })

  ngOnInit(): void {
    this.authorService.getAuthorForAutPub(this.data.author['id']).subscribe({
      next: data => {
        this.author = data;
        this.form.get('affiliation').setValue(this.data['authorPub']['affiliation'])
        //if (!this.author.institutes || this.author.institutes.length === 0) this.abort();
      }
    })
    this.instService.getinstitutes().subscribe({
      next: data => {
        this.institutes = data.sort((a, b) => a.label.localeCompare(b.label));
        this.filtered_institutes = this.form.get('inst').valueChanges.pipe(
          startWith(''),
          map(value => this._filterInst(value || '')),
        );
      }
    })
  }

  compare(i1,i2) {
    return (i1?.id === i2?.id)
  }

  action() {
    if (this.institute && !this.author.institutes.find(e => this.institute.id === e.id)) {
      //save institute to author
      this.author.institutes.push(this.institute);
      this.authorService.update(this.author).subscribe({
        next: data => {
          console.log('author institute updated')
        }
      })
    }
    if (this.form.get('affiliation').value && !this.institute.aliases?.find(e => this.form.get('affiliation').value.includes(e.alias))) {
      //open alias dialog
      let aliases = [this.form.get('affiliation').value];

      let dialogRef = this.dialog.open(AliasFormComponent, {
        width: '400px',
        maxHeight: '800px',
        data: {
          aliases
        },
        disableClose: true
      });
      dialogRef.afterClosed().subscribe(result => {
        if (result && result.length > 0) {
          this.institute.aliases.push({elementId: this.institute.id, alias: result[0]});
          this.instService.update(this.institute).subscribe()
        }
        this.dialogRef.close(this.institute);
      });
    }
    else this.dialogRef.close(this.institute);
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
}
