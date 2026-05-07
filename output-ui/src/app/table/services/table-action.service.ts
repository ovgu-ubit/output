import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ComponentType } from '@angular/cdk/portal';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, concatMap, of } from 'rxjs';
import { EntityFormComponent, EntityService, isPersistedEntityDialogResult } from 'src/app/services/entities/service.interface';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/shared/confirm-dialog/confirm-dialog.component';
import { CombineDialogComponent } from '../dialog/combine-dialog/combine-dialog.component';
import {  Entity  } from '@output/interfaces';

@Injectable()
export class TableActionService<T extends Entity, E extends Entity> {
  
  public serviceClass: EntityService<E, T>;
  public formComponent: ComponentType<EntityFormComponent<E>>;
  public nameSingle: string;
  public name: string;
  public softDelete = false;
  public combineAlias = true;

  constructor(
    private dialog: MatDialog,
    private _snackBar: MatSnackBar,
    private location: Location,
    private router: Router,
    private errorPresentation: ErrorPresentationService
  ) {}

  public init(config: {
    serviceClass: EntityService<E, T>;
    formComponent: ComponentType<EntityFormComponent<E>>;
    nameSingle: string;
    name: string;
    softDelete?: boolean;
    combineAlias?: boolean;
  }) {
    this.serviceClass = config.serviceClass;
    this.formComponent = config.formComponent;
    this.nameSingle = config.nameSingle;
    this.name = config.name;
    this.softDelete = config.softDelete || false;
    this.combineAlias = config.combineAlias !== false;
  }

  edit(row: any, updateDataCallback: () => void) {
    this.location.replaceState(this.router.url.split('?')[0], 'id=' + row.id)
    let dialogRef = this.dialog.open(this.formComponent, {
      width: '1000px',
      maxHeight: '800px',
      data: {
        entity: row,
        persistOnSave: true
      },
      disableClose: true
    });
    
    dialogRef.afterClosed().pipe(concatMap(result => {
      this.location.replaceState(this.router.url.split('?')[0])
      if (isPersistedEntityDialogResult(result)) {
        this.showSuccess(`${this.nameSingle} geändert`);
        updateDataCallback();
        return of(null);
      } else if (result && result.updated) {
        return this.serviceClass.update(result).pipe(concatMap(() => {
          this.showSuccess(`${this.nameSingle} geändert`);
          updateDataCallback();
          return of(null);
        }));
      } else if (this.hasEntityId(result)) {
        return this.serviceClass.update(result);
      } else {
        return of(null);
      }
    }), catchError(err => {
      this.errorPresentation.present(err, { action: 'update', entity: this.nameSingle });
      return of(null)
    })).subscribe();
  }

  add(updateDataCallback: () => void) {
    let dialogRef = this.dialog.open(this.formComponent, {
      width: '800px',
      maxHeight: '800px',
      data: {
        entity: {},
        persistOnSave: true
      },
      disableClose: true
    });
    
    dialogRef.afterClosed().pipe(concatMap(result => {
      if (isPersistedEntityDialogResult(result)) {
        this.showSuccess(`${this.nameSingle} wurde angelegt`);
        updateDataCallback();
        return of(null);
      } else if (result) {
        return this.serviceClass.add(result).pipe(concatMap(() => {
          this.showSuccess(`${this.nameSingle} wurde angelegt`);
          updateDataCallback();
          return of(null);
        }));
      } else {
        return of(null);
      }
    }), catchError(err => {
      this.errorPresentation.present(err, { action: 'create', entity: this.nameSingle });
      return of(null)
    })).subscribe();
  }

  delete(selectedItems: T[], updateDataCallback: () => void) {
    if (!selectedItems || selectedItems.length === 0) return;

    let data: ConfirmDialogModel = {
      title: `${this.name} löschen`,
      message: `Möchten Sie ${selectedItems.length} ${this.name} löschen, dies kann nicht rückgängig gemacht werden?`,
      soft: this.softDelete
    }

    let dialogRef = this.dialog.open(ConfirmDialogComponent, {
      maxWidth: "400px",
      data
    });

    dialogRef.afterClosed().pipe(concatMap(dialogResult => {
      if (dialogResult) {
        return this.serviceClass.delete(selectedItems.map(e => e.id), dialogResult.soft).pipe(concatMap((res: any) => {
          this.showSuccess(`${res['affected']} ${this.name} gelöscht`);
          updateDataCallback();
          return of(null);
        }));
      } else {
        return of(null);
      }
    }), catchError(err => {
      this.errorPresentation.present(err, { action: 'delete', entityPlural: this.name });
      return of(null)
    })).subscribe();
  }

  combine(selectedItems: T[], updateDataCallback: () => void) {
    if (selectedItems.length < 2) {
      this._snackBar.open(`Bitte selektieren Sie min. zwei ${this.name}`, 'Alles klar!', {
        duration: 5000,
        panelClass: [`warning-snackbar`],
        verticalPosition: 'top'
      })
      return;
    } 
    
    let dialogRef = this.dialog.open(CombineDialogComponent<E>, {
      width: '800px',
      maxHeight: '800px',
      data: {
        ents: selectedItems,
        aliases: this.combineAlias
      },
      disableClose: true
    });
    
    dialogRef.afterClosed().pipe(concatMap(result => {
      if (result) {
        let otherIds = selectedItems.filter(e => e.id !== result.id).map(e => e.id);
        let options = { aliases: result.aliases, aliases_first_name: result.aliases_first_name, aliases_last_name: result.aliases_last_name };
        return this.serviceClass.combine(result.id, otherIds, options).pipe(concatMap(() => {
          this.showSuccess(`${this.name} wurden zusammengeführt`);
          updateDataCallback();
          return of(null);
        }));
      } else {
        return of(null);
      }
    }), catchError(err => {
      this.errorPresentation.present(err, { action: 'combine', entityPlural: this.name });
      return of(null)
    })).subscribe();
  }

  private showSuccess(message: string) {
    this._snackBar.open(message, 'Super!', {
      duration: 5000,
      panelClass: [`success-snackbar`],
      verticalPosition: 'top'
    });
  }

  private hasEntityId(entity: Entity | null | undefined): boolean {
    return entity?.id !== undefined && entity?.id !== null;
  }
}
