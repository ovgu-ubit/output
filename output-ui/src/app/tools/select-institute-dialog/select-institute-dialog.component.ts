import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthorService } from 'src/app/services/entities/author.service';
import { Author, Institute } from '../../../../../output-interfaces/Publication';
import { Observable, map, startWith } from 'rxjs';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { InstituteService } from 'src/app/services/entities/institute.service';

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
  @Inject(MAT_DIALOG_DATA) public data: any, private formBuilder: FormBuilder, private authorService:AuthorService, private instService:InstituteService) {}

  form = this.formBuilder.group({
    institute: [''],
    inst: ['']
  })

  ngOnInit(): void {
    this.authorService.getAuthor(this.data.author['id']).subscribe({
      next: data => {
        this.author = data;
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
    this.dialogRef.close(this.institute);
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
