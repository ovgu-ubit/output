import { ComponentType } from '@angular/cdk/portal';
import { Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { map, Observable, startWith } from 'rxjs';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { EntityService, isPersistedEntityDialogResult } from 'src/app/services/entities/service.interface';
import { Entity } from '../../../../../output-interfaces/Publication';
import { ConfirmDialogComponent, ConfirmDialogModel } from '../confirm-dialog/confirm-dialog.component';

@Component({
    selector: 'app-select-entity',
    templateUrl: './select-entity.component.html',
    styleUrl: './select-entity.component.css',
    standalone: false
})
export class SelectEntityComponent<T extends Entity> implements OnInit, OnChanges {
  ents: T[];
  filtered_ents: Observable<T[]>;

  @Input()
  ent?: T;

  @Input()
  name: string;

  @Input()
  disabled: boolean;

  @Input()
  resetOnSelect?: boolean;

  @Input()
  serviceClass: EntityService<T, any>

  @Input()
  formComponent?: ComponentType<any>;

  @Output()
  selected = new EventEmitter<T>();

  form: FormGroup = inject(FormBuilder).group({
    input: ['']
  });

  exists = false;

  _snackBar = inject(MatSnackBar);
  dialog = inject(MatDialog);
  errorPresentation = inject(ErrorPresentationService);

  constructor() { }

  ngOnInit(): void {

  }

  getValue(ent?: T) {
    if (ent) return ent.label;
    return this.ent?.label;
  }

  setValue(ent: any, value: string) {
    ent.label = value;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['serviceClass']) this.updateEnts();
    if (changes['ent']) {
      if (this.ent) this.form.get('input').setValue(this.getValue());
      else this.form.get('input').setValue('');
    }
    if (changes['disabled']) {
      if (changes['disabled'].currentValue) this.form.disable();
      else this.form.enable();
    }
  }

  updateEnts() {
    this.serviceClass.getAll().pipe(map(data => {
      this.ents = data.sort((a, b) => this.getValue(a).localeCompare(this.getValue(b)));
      this.filtered_ents = this.form.get('input').valueChanges.pipe(
        startWith(this.ent ? this.getValue() : ''),
        map(value => this.test(value)),
        map(value => this._filterEnt(value || '')),
      );
    })).subscribe({
      error: (error) => {
        this.errorPresentation.present(error, { action: 'load', entityPlural: this.name });
      }
    });
  }

  test(value: string) {
    if (!value || this.ents.find(e => this.getValue(e) === value)) {
      this.exists = true;
    } else this.exists = false;
    return value;
  }

  select(event) {
    if (!event.value) {
      this.selected.next(null);
      return;
    }
    if (this.disabled) {
      this.dialog.open(this.formComponent, {
        width: '800px',
        data: {
          entity: this.ent,
          locked: true,
        },
        disableClose: true
      }).afterClosed().subscribe(viewResult => {
        if (viewResult && viewResult.id) {
          this.serviceClass.update(viewResult).subscribe({
            error: (error) => {
              this.errorPresentation.present(error, { action: 'save', entity: this.name });
            }
          });
        }
      });
      return;
    }

    this.form.get('input').disable();

    if (!this.ents.find(e => this.getValue(e) === event.value) && this.formComponent) {
      const dialogData = new ConfirmDialogModel('Neuer ' + this.name, `öchten Sie den ${this.name} "${event.value}" anlegen?`);

      this.dialog.open(ConfirmDialogComponent, {
        maxWidth: '400px',
        data: dialogData
      }).afterClosed().subscribe(dialogResult => {
        if (!dialogResult) {
          this.form.get('input').enable();
          return;
        }

        const entity = {} as any;
        this.setValue(entity, event.value);

        this.dialog.open(this.formComponent, {
          width: '800px',
          data: {
            entity,
            persistOnSave: true
          },
          disableClose: true
        }).afterClosed().subscribe(createResult => {
          this.form.get('input').enable();
          if (isPersistedEntityDialogResult<T>(createResult)) {
            this.handlePersistedResult(createResult.entity, 'wurde hinzugefügt');
            return;
          }
          if (!createResult) return;

          this.serviceClass.add(createResult).subscribe({
            next: data => {
              this.handlePersistedResult(data, 'wurde hinzugefügt');
            },
            error: (error) => {
              this.errorPresentation.present(error, { action: 'create', entity: this.name });
            }
          });
        });
      });
      return;
    }

    if (!this.formComponent) {
      this.form.get('input').enable();
      return;
    }

    this.dialog.open(this.formComponent, {
      width: '800px',
      data: {
        entity: this.ent,
        persistOnSave: true
      },
      disableClose: true
    }).afterClosed().subscribe(updateResult => {
      if (isPersistedEntityDialogResult<T>(updateResult)) {
        this.handlePersistedResult(updateResult.entity, 'wurde geändert');
      } else if (updateResult && updateResult.updated) {
        this.serviceClass.update(updateResult).subscribe({
          next: data => {
            this.handlePersistedResult(data, 'wurde geändert');
          },
          error: (error) => {
            this.errorPresentation.present(error, { action: 'update', entity: this.name });
          }
        });
      } else if (updateResult && updateResult.id) {
        this.serviceClass.update(updateResult).subscribe({
          error: (error) => {
            this.errorPresentation.present(error, { action: 'save', entity: this.name });
          }
        });
      }
      this.form.get('input').enable();
    });
  }

  _filterEnt(value: string): T[] {
    const filterValue = value.toLowerCase();
    return this.ents.filter(pub => pub && (this.getValue(pub).toLowerCase().includes(filterValue)
    || (pub['identifiers'] && pub['identifiers'].find(e => e.value.toLowerCase().includes(filterValue))
    || (pub['short_label'] && pub['short_label'].toLowerCase().includes(filterValue))
    || (pub['number'] && pub['number'].toLowerCase().includes(filterValue))
    || (pub['orcid'] && pub['orcid'].toLowerCase().includes(filterValue))
   )));
  }

  selectedEnt(event: MatAutocompleteSelectedEvent): void {
    if (this.disabled) return;
    this.ent = this.ents.find(e => this.getValue(e).trim().toLowerCase() === event.option.value.trim().toLowerCase());
    if (!this.resetOnSelect) this.form.get('input').setValue(this.getValue());
    else this.form.get('input').setValue('');
    this.selected.next(this.ent);
  }

  clear() {
    this.form.get('input').setValue('');
    this.ent = null;
    this.selected.next(this.ent);
  }

  private handlePersistedResult(value: unknown, action: string): void {
    this._snackBar.open(this.name + ' ' + action, 'Super!', {
      duration: 5000,
      panelClass: ['success-snackbar'],
      verticalPosition: 'top'
    });
    this.ent = this.normalizeSavedEntity(value);
    this.form.get('input').setValue(this.getValue());
    this.selected.next(this.ent);
    this.updateEnts();
  }

  private normalizeSavedEntity(value: unknown): T {
    if (Array.isArray(value)) {
      return value[0] as T;
    }
    return value as T;
  }
}
