import { Component, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { Entity } from '../../../../../output-interfaces/Publication';
import { EntityFormComponent, EntityService } from 'src/app/interfaces/service';
import { ComponentType } from '@angular/cdk/portal';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { FormBuilder, FormGroup } from '@angular/forms';
import { map, Observable, pipe, startWith } from 'rxjs';
import { ConfirmDialogComponent, ConfirmDialogModel } from '../confirm-dialog/confirm-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-select-entity',
  templateUrl: './select-entity.component.html',
  styleUrl: './select-entity.component.css'
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
  formComponent?: ComponentType<EntityFormComponent<T>>;

  @Output()
  selected = new EventEmitter<T>();

  form: FormGroup = inject(FormBuilder).group({
    input: ['']
  });

  constructor(private _snackBar: MatSnackBar, private dialog: MatDialog) { }

  ngOnInit(): void {

  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['serviceClass']) this.updateEnts();
    if (changes['ent']) {
      if (this.ent) this.form.get('input').setValue(this.ent.label)
      else this.form.get('input').setValue('')
    }
    if (changes['disabled']) {
      if (changes['disabled'].currentValue) this.form.disable()
      else this.form.enable();
    }
  }

  updateEnts() {
    this.serviceClass.getAll().pipe(map(data => {
      this.ents = data.sort((a, b) => a.label.localeCompare(b.label));
      this.filtered_ents = this.form.get('input').valueChanges.pipe(
        startWith(this.ent ? this.ent.label : ''),
        map(value => this._filterEnt(value || '')),
      );
    })).subscribe();
  }

  select(event) {
    if (this.disabled) return;
    if (!event.value) {
      this.selected.next(null)
      return;
    }
    this.form.get('input').disable();
    if (!this.ents.find(e => e.label === event.value) && this.formComponent) {
      let dialogData = new ConfirmDialogModel("Neuer " + this.name, `Möchten Sie den ${this.name} "${event.value}" anlegen?`);

      let dialogRef = this.dialog.open(ConfirmDialogComponent, {
        maxWidth: "400px",
        data: dialogData
      });

      dialogRef.afterClosed().subscribe(dialogResult => {
        if (dialogResult) {
          let dialogRef1 = this.dialog.open(this.formComponent, {
            width: "600px",
            data: {
              entity: {
                label: event.value
              }
            }
          });
          dialogRef1.afterClosed().subscribe(dialogResult => {
            this.form.get('input').enable();
            if (dialogResult) {
              this.serviceClass.add(dialogResult).subscribe({
                next: data => {
                  this._snackBar.open(this.name + ' wurde hinzugefügt', 'Super!', {
                    duration: 5000,
                    panelClass: [`success-snackbar`],
                    verticalPosition: 'top'
                  })
                  this.ent = data[0];
                  this.form.get('input').setValue(this.ent.label)
                  this.selected.next(this.ent)
                }
              })
            }
          });
        } else this.form.get('input').enable();
      });
    } else if (this.formComponent) {
      let dialogRef = this.dialog.open(this.formComponent, {
        width: "600px",
        data: {
          entity: this.ent
        }
      });
      dialogRef.afterClosed().subscribe(dialogResult => {
        if (dialogResult && dialogResult.updated) {
          this.serviceClass.update(dialogResult).subscribe({
            next: data => {
              this._snackBar.open(this.name + ' wurde geändert', 'Super!', {
                duration: 5000,
                panelClass: [`success-snackbar`],
                verticalPosition: 'top'
              })
              this.ent = data[0];
              this.form.get('input').setValue(this.ent.label)
              this.selected.next(this.ent)
            }
          })
        }
        this.form.get('input').enable();
      });
    }
  }

  private _filterEnt(value: string): T[] {
    const filterValue = value.toLowerCase();

    return this.ents.filter(pub => pub?.label.toLowerCase().includes(filterValue) || (pub?.identifiers && pub?.identifiers.find(e => e.value.toLowerCase().includes(filterValue))));
  }

  selectedEnt(event: MatAutocompleteSelectedEvent): void {
    if (this.disabled) return;
    this.ent = this.ents.find(e => e.label.trim().toLowerCase() === event.option.value.trim().toLowerCase());
    if (!this.resetOnSelect) this.form.get('input').setValue(this.ent.label)
    else this.form.get('input').setValue('');
    this.selected.next(this.ent)
  }
}
