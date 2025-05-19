import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Publication, PublicationDuplicate } from '../../../../../output-interfaces/Publication';
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

  loading = true;

  dupl: PublicationDuplicate;

  ent1: Publication;
  ent2: Publication;

  att_list: string[] = [
    'id',
    'doi',
    'title',
    'authors',
    'pub_date', ,
    'publisher.label',
    'pub_type.label',
    'greater_entity.label',
    'oa_category.label',
    'contract.label',
  ]

  ngOnInit(): void {
    this.loading = true;
    this.dupl = this.data.entity;
    let ob$ = this.duplicateService.getOne(this.data.entity.id).pipe(concatMap(data => {
      let id1 = data.id_first;
      let id2 = data.id_second;
      return this.publicationService.getOne(id1).pipe(concatMap(data => {
        this.ent1 = data;
        return this.publicationService.getOne(id2).pipe(concatMap(data => {
          this.ent2 = data;
          this.loading = false;
          /*for (let attr in this.ents[0]) {
            this.att_list.push(attr);
          }*/
          return of(null)
        }))
      }))
    }));
    ob$.subscribe()
  }

  action(pos: number) {
    if (pos === null) { // not a suitable duplicate => soft delete
      this.duplicateService.delete([this.dupl.id]).subscribe({
        next: data => {
          this.abort(); // does not update the table
        }
      })
    } else if (pos === 0) {
      this.publicationService.combine(this.ent1.id, [this.ent2.id])
      //...
    } else {
      this.publicationService.combine(this.ent2.id, [this.ent1.id])
      
      //...
    }
  }

  abort() {
    //unlock unchanged publications
    this.publicationService.update({ id: this.ent1.id, locked_at: null }).subscribe();
    this.publicationService.update({ id: this.ent2.id, locked_at: null }).subscribe();
    this.dialogRef.close(null);
  }

  getStyle(att: string) {
    let style = "background:red;";
    if (this.getAttribute(this.ent1, att) != this.getAttribute(this.ent2, att)) return style;
    else return "";
  }

  getAttribute(ent: Publication, att: string) {
    if (!ent) return null;
    if (!att) return null;
    if (!att.includes(".")) return ent[att];
    else {
      let split = att.split(".");
      let value = ent;
      for (let key of split) value = value[key] ? value[key] : "";
      return value;
    }
  }
}
