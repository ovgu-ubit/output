import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { PublicationDuplicateService } from 'src/app/services/entities/duplicate.service';
import { Observable, catchError, concatMap, of } from 'rxjs';
import { PublicationService } from 'src/app/services/entities/publication.service';
import {  ApiErrorCode, Publication, PublicationDuplicate  } from '@output/interfaces';
import { ApiErrorParser } from 'src/app/core/errors/api-error-parser.service';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/shared/confirm-dialog/confirm-dialog.component';

@Component({
    selector: 'app-duplicate-dialog',
    templateUrl: './duplicate-dialog.component.html',
    styleUrl: './duplicate-dialog.component.css',
    standalone: false
})
export class DuplicateDialogComponent implements OnInit {
  constructor(public dialogRef: MatDialogRef<DuplicateDialogComponent>, @Inject(MAT_DIALOG_DATA) public data: any,
    private dialog: MatDialog,
    private duplicateService: PublicationDuplicateService,
    private publicationService: PublicationService,
    private errorPresentation: ErrorPresentationService,
    private errorParser: ApiErrorParser) { }

  loading = true;

  dupl: PublicationDuplicate;

  ent1: Publication;
  ent2: Publication;

  soft_deleted = false;

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
      if (data.delete_date) this.soft_deleted = true;
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

  action(pos: number | null) {
    this.createActionRequest(pos).pipe(catchError(error => this.handleActionError(error, pos))).subscribe({
      next: data => {
        if (data) this.dialogRef.close({ id: this.dupl.id, updated: true });
      }
    })
  }

  private createActionRequest(pos: number | null, ignoreLocks = false): Observable<any> {
    if (pos === null) { // not a suitable duplicate => soft delete
      return this.duplicateService.delete([this.dupl.id], true)
    } else if (pos === 0) {
      return this.publicationService.combine(this.ent1.id, [this.ent2.id], ignoreLocks ? { ignoreLocks: true } : undefined)
    } else {
      return this.publicationService.combine(this.ent2.id, [this.ent1.id], ignoreLocks ? { ignoreLocks: true } : undefined)
    }
  }

  private handleActionError(error: unknown, pos: number | null): Observable<any> {
    const parsed = this.errorParser.parse(error);
    if (pos === null || parsed.code !== ApiErrorCode.ENTITY_LOCKED) {
      this.errorPresentation.present(parsed, { action: 'combine', entityPlural: 'Publikationen' });
      return of(null);
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      maxWidth: "400px",
      data: new ConfirmDialogModel(
        'Publikation gesperrt',
        'Mindestens eine Publikation ist gesperrt. Möchten Sie das Lock ignorieren und trotzdem zusammenführen?'
      )
    });

    return dialogRef.afterClosed().pipe(concatMap(dialogResult => {
      if (!dialogResult) return of(null);
      return this.createActionRequest(pos, true).pipe(catchError(retryError => {
        this.errorPresentation.present(retryError, { action: 'combine', entityPlural: 'Publikationen' });
        return of(null);
      }));
    }));
  }

  restore() {
    this.duplicateService.update({id:this.dupl.id, delete_date: null}).subscribe({
      next: data => {
        this.dialogRef.close({ id: this.dupl.id, updated: true });
      }
    })
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
