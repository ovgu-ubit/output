import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { CostCenterService } from 'src/app/services/entities/cost-center.service';
import { CostCenter } from '../../../../../../output-interfaces/Publication';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-cost-center-form',
  templateUrl: './cost-center-form.component.html',
  styleUrls: ['./cost-center-form.component.css']
})
export class CostCenterFormComponent implements OnInit, AfterViewInit {

  public form: FormGroup;

  cost_center:CostCenter;
  disabled:boolean;

  constructor(public dialogRef: MatDialogRef<CostCenterFormComponent>, public tokenService: AuthorizationService,
    @Inject(MAT_DIALOG_DATA) public data: any, private formBuilder: FormBuilder, private ccService: CostCenterService,
    private _snackBar:MatSnackBar, private dialog:MatDialog) { }

  ngAfterViewInit(): void {
    if (!this.tokenService.hasRole('writer') && !this.tokenService.hasRole('admin')) {
      this.disable();
    }
    if (this.data.cost_center?.id) {
      this.ccService.getCostCenter(this.data.cost_center.id).subscribe({
        next: data => {
          this.cost_center = data;
          this.form.patchValue(this.cost_center)
          if (this.cost_center.locked_at) {
            this.disable();
            this._snackBar.open('Kostenstelle wird leider gerade durch einen anderen Nutzer bearbeitet', 'Ok.', {
              duration: 5000,
              panelClass: [`warning-snackbar`],
              verticalPosition: 'top'
            })
          }
        }
      })
    }
    else {
      this.cost_center = {
        number: '',
        label: ''
      };
      this.form.patchValue(this.cost_center)
    }
  }

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      id: [''],
      label: ['', Validators.required],
      number: ['', Validators.required],
    });
    this.form.controls.id.disable();
  }

  disable() {
    this.disabled = true;
    this.form.disable();
  }

  action() {
    if (this.form.invalid) return;
    this.cost_center = { ...this.cost_center, ...this.form.getRawValue() }
    if (!this.cost_center.id) this.cost_center.id = undefined;
    this.dialogRef.close(this.cost_center)
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
        } else if (this.cost_center.id) this.dialogRef.close({ id: this.cost_center.id, locked_at: null })
        else this.close()
      });
    } else if (this.cost_center.id) this.dialogRef.close({ id: this.cost_center.id, locked_at: null })
    else this.close()
  }
}
