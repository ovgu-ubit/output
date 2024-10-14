import { Component,OnInit, AfterViewInit,Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Role } from '../../../../../../output-interfaces/Publication';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { RoleService } from 'src/app/services/entities/role.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-role-form',
  templateUrl: './role-form.component.html',
  styleUrls: ['./role-form.component.css']
})
export class RoleFormComponent implements OnInit, AfterViewInit {

  public form: FormGroup;

  role:Role;
  disabled:boolean;

  constructor(public dialogRef: MatDialogRef<RoleFormComponent>, public tokenService: AuthorizationService,
    @Inject(MAT_DIALOG_DATA) public data: any, private formBuilder: FormBuilder, private roleService: RoleService,
    private _snackBar:MatSnackBar, private dialog:MatDialog) { }

  ngAfterViewInit(): void {
    if (!this.tokenService.hasRole('writer') && !this.tokenService.hasRole('admin')) {
      this.disable();
    }
    if (this.data.role?.id) {
      this.roleService.getRole(this.data.role.id).subscribe({
        next: data => {
          this.role = data;
          this.form.patchValue(this.role)
          if (this.role.locked_at) {
            this.disable();
            this._snackBar.open('Kostenart wird leider gerade durch einen anderen Nutzer bearbeitet', 'Ok.', {
              duration: 5000,
              panelClass: [`warning-snackbar`],
              verticalPosition: 'top'
            })
          }
        }
      })
    }
    else {
      this.role = {
        label: ''
      };
      this.form.patchValue(this.role)
    }
  }

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      id: [''],
      label: ['', Validators.required],
    });
    this.form.controls.id.disable();
  }

  disable() {
    this.disabled = true;
    this.form.disable();
  }

  action() {
    if (this.form.invalid) return;
    this.role = { ...this.role, ...this.form.getRawValue() }
    if (!this.role.id) this.role.id = undefined;
    this.dialogRef.close(this.role)
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
        } else if (this.role.id) this.dialogRef.close({ id: this.role.id, locked_at: null })
        else this.close()
      });
    } else if (this.role.id) this.dialogRef.close({ id: this.role.id, locked_at: null })
    else this.close()
  }
}

