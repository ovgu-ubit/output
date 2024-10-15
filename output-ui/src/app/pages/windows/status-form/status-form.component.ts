import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { StatusService } from 'src/app/services/entities/status.service';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';
import { Status } from '../../../../../../output-interfaces/Publication';

export function createUniqueValidator(statuses:Status[]): ValidatorFn {
  return (control:AbstractControl) : ValidationErrors | null => {
      const value = control.value;
      if (!value) {
          return null;
      }
      let notUnique = statuses.find(e => e.id == value)

      return notUnique? {notUnique:true}: null;
  }
}

@Component({
  selector: 'app-status-form',
  templateUrl: './status-form.component.html',
  styleUrl: './status-form.component.css'
})
export class StatusFormComponent implements OnInit, AfterViewInit {

  public form: FormGroup;

  status:Status;
  disabled:boolean;
  statuses:Status[];

  constructor(public dialogRef: MatDialogRef<StatusFormComponent>, public tokenService: AuthorizationService,
    @Inject(MAT_DIALOG_DATA) public data: any, private formBuilder: FormBuilder, private statusService: StatusService,
    private _snackBar:MatSnackBar, private dialog:MatDialog) { }

  ngAfterViewInit(): void {
    if (!this.tokenService.hasRole('writer') && !this.tokenService.hasRole('admin')) {
      this.disable();
    }
    if (this.data.status?.id !== undefined && this.data.status?.id !== null) {
      this.statusService.getStatus(this.data.status.id).subscribe({
        next: data => {
          this.status = data;
          this.form.patchValue(this.status)
          if (this.status.locked_at) {
            this.disable();
            this._snackBar.open('Status wird leider gerade durch einen anderen Nutzer bearbeitet', 'Ok.', {
              duration: 5000,
              panelClass: [`warning-snackbar`],
              verticalPosition: 'top'
            })
          }
          this.form.get('id').disable();
        }
      })
    }
    else {
      this.status = {
        label: ''
      };
      this.form.patchValue(this.status)
    }
    this.statusService.getStatuses().subscribe({
      next: data => {
        this.statuses = data;
        if (this.data.status?.id !== undefined && this.data.status?.id !== null)  this.statuses = this.statuses.filter(e => e.id !== this.data.status.id)
        this.form.get('id').addValidators(createUniqueValidator(this.statuses))
      }
    })
  }

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      id: ['', [Validators.required, Validators.pattern("[0-9]*")]],
      label: ['', Validators.required],
      description: [''],
    });
  }

  disable() {
    this.disabled = true;
    this.form.disable();
  }

  action() {
    if (this.form.invalid) return;
    this.status = { ...this.status, ...this.form.getRawValue() }
    this.dialogRef.close(this.status)
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
        } else if (this.status.id) this.dialogRef.close({ id: this.status.id, locked_at: null })
        else this.close()
      });
    } else if (this.status.id) this.dialogRef.close({ id: this.status.id, locked_at: null })
    else this.close()
  }
}

