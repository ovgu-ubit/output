import { AfterViewInit, Component, Inject, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';
import { Entity } from '../../../../../../output-interfaces/Publication';
import { EntityService } from 'src/app/interfaces/service';
import { Observable, of, concatMap, map } from 'rxjs'

@Component({
  selector: 'app-abstract-form',
  templateUrl: './abstract-form.component.html',
  styleUrl: './abstract-form.component.css'
})
export class AbstractFormComponent<T extends Entity> implements OnInit, AfterViewInit {

  public form: FormGroup;

  @Input() service: EntityService<T, any>;
  @Input() name: string;
  @Input() fields: { key: string, title: string, type?: string, required?: boolean }[];
  @Input() dialogRef: MatDialogRef<any>;
  @Input() data: any;
  @Input() preProcessing?: Observable<any>

  entity: T;
  disabled: boolean;

  constructor(public tokenService: AuthorizationService,
    private formBuilder: FormBuilder,
    private _snackBar: MatSnackBar, private dialog: MatDialog) { }

  ngAfterViewInit(): void {
    if (!this.preProcessing) this.preProcessing = of(null);
    let ob$ = this.preProcessing.pipe(concatMap(data => {
      if (!this.tokenService.hasRole('writer') && !this.tokenService.hasRole('admin')) {
        this.disable();
      }
      if (this.data.entity?.id) {
        this.form.controls.id.disable();
        return this.service.getOne(this.data.entity.id).pipe(map(data => {
          this.entity = data;
          this.form.patchValue(this.entity)
          if (this.entity.locked_at) {
            this.disable();
            this._snackBar.open(`${this.name} wird leider gerade durch einen anderen Nutzer bearbeitet`, 'Ok.', {
              duration: 5000,
              panelClass: [`warning-snackbar`],
              verticalPosition: 'top'
            })
          }
        }
        ))
      } else {
        /*this.entity = {
                label: ''
              };*/
        this.fields = this.fields.filter(e => e.key !== 'id' || e.type === 'status')
        this.form.patchValue(this.entity)
      }
      return of(null)
    })).subscribe();

  }

  ngOnInit(): void {
    let group = {};
    for (let field of this.fields) {
      group[field.key] = field.required ? ['', Validators.required] : ['']
    }

    this.form = this.formBuilder.group(group);

  }

  disable() {
    this.disabled = true;
    this.form.disable();
  }

  action() {
    console.log(this.form.errors)
    if (this.form.invalid) return;
    this.entity = { ...this.entity, ...this.form.getRawValue() }
    if (!this.entity.id) this.entity.id = undefined;
    this.dialogRef.close({ ...this.entity, updated: true })
  }

  close() {
    this.dialogRef.close(null)
  }

  abort() {
    if (this.form.dirty) {
      let dialogData = new ConfirmDialogModel("Ungesicherte Änderungen", `Es gibt ungespeicherte Änderungen, möchten Sie diese zunächst speichern?`);

      let dialogRef = this.dialog.open(ConfirmDialogComponent, {
        maxWidth: "400px",
        data: dialogData
      });

      dialogRef.afterClosed().subscribe(dialogResult => {
        if (dialogResult) { //save
          this.action();
        } else if (this.entity?.id) this.dialogRef.close({ id: this.entity.id, locked_at: null })
        else this.close()
      });
    } else if (this.entity?.id) this.dialogRef.close({ id: this.entity.id, locked_at: null })
    else this.close()
  }
}
