import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Publication } from '../../../../../output-interfaces/Publication';
import { AliasFormComponent } from '../alias-form/alias-form.component';
import { PublicationDuplicateService } from 'src/app/services/entities/duplicate.service';
import { concatMap, of } from 'rxjs';
import { PublicationService } from 'src/app/services/entities/publication.service';

@Component({
  selector: 'app-duplicate-dialog',
  templateUrl: './duplicate-dialog.component.html',
  styleUrl: './duplicate-dialog.component.css'
})
export class DuplicateDialogComponent implements OnInit {
  constructor(public dialogRef: MatDialogRef<DuplicateDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: any,
    private dialog: MatDialog, private duplicateService: PublicationDuplicateService, private publicationService: PublicationService) { }

  ents: Publication[];

  att_list: string[] = []

  ngOnInit(): void {
    this.ents = [];
    let ob$ = this.duplicateService.getOne(this.data.entity.id).pipe(concatMap(data => {
      let id1 = data.id_first;
      let id2 = data.id_second;
      return this.publicationService.getOne(id1).pipe(concatMap(data => {
        this.ents[0] = data;
        return this.publicationService.getOne(id2).pipe(concatMap(data => {
          this.ents[1] = data;

          for (let attr in this.ents[0]) {
            this.att_list.push(attr);
          }
          return of(null)
        }))
      }))
    }));
    ob$.subscribe()
  }

  action(pos: number) {
  }

  abort() {
    this.dialogRef.close(null);
  }

  getStyle(att: string) {
    let style = "background:red;";
    let value = "";
    for (let ent of this.ents) {
      if (!value) value = ent[att];
      else if (ent[att] != value) return style;
    }
    return "";
  }
}
