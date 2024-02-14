import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { CostTypeService } from 'src/app/services/entities/cost-type.service';
import { CostType } from '../../../../../../output-interfaces/Publication';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-cost-type-form',
  templateUrl: './cost-type-form.component.html',
  styleUrls: ['./cost-type-form.component.css']
})
export class CostTypeFormComponent implements OnInit, AfterViewInit {

  public form: FormGroup;

  cost_type:CostType;
  disabled:boolean;

  constructor(public dialogRef: MatDialogRef<CostTypeFormComponent>, public tokenService: AuthorizationService,
    @Inject(MAT_DIALOG_DATA) public data: any, private formBuilder: FormBuilder, private ctService: CostTypeService,
    private _snackBar:MatSnackBar, private dialog:MatDialog) { }

  ngAfterViewInit(): void {
    if (!this.tokenService.hasRole('writer')) {
      this.disable();
    }
    if (this.data.cost_type?.id) {
      this.ctService.getCostType(this.data.cost_type.id).subscribe({
        next: data => {
          this.cost_type = data;
          this.form.patchValue(this.cost_type)
          if (this.cost_type.locked_at) {
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
      this.cost_type = {
        label: ''
      };
      this.form.patchValue(this.cost_type)
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
    this.cost_type = { ...this.cost_type, ...this.form.getRawValue() }
    if (!this.cost_type.id) this.cost_type.id = undefined;
    this.dialogRef.close(this.cost_type)
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
        } else if (this.cost_type.id) this.dialogRef.close({ id: this.cost_type.id, locked_at: null })
        else this.close()
      });
    } else if (this.cost_type.id) this.dialogRef.close({ id: this.cost_type.id, locked_at: null })
    else this.close()
  }
}
