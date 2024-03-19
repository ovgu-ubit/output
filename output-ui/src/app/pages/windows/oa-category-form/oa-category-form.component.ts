import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { OACategoryService } from 'src/app/services/entities/oa-category.service';
import { OA_Category } from '../../../../../../output-interfaces/Publication';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-oa-category-form',
  templateUrl: './oa-category-form.component.html',
  styleUrls: ['./oa-category-form.component.css']
})
export class OaCategoryFormComponent implements OnInit, AfterViewInit{

  public form: FormGroup;

  oa_category:OA_Category;
  disabled = false;

  constructor(public dialogRef: MatDialogRef<OaCategoryFormComponent>, public tokenService: AuthorizationService,
    @Inject(MAT_DIALOG_DATA) public data: any, private formBuilder: FormBuilder, private oaService:OACategoryService,
    private _snackBar:MatSnackBar, private dialog:MatDialog) {}

  ngAfterViewInit(): void {
    if (!this.tokenService.hasRole('writer') && !this.tokenService.hasRole('admin')) {
      this.disable();
    }
    if (this.data.oa_category.id) {
      this.oaService.getOACategory(this.data.oa_category.id).subscribe({
        next: data => {
          this.oa_category = data;
          this.form.patchValue(this.oa_category)
          if (this.oa_category.locked_at) {
            this.disable();
            this._snackBar.open('OA-Kategorie wird leider gerade durch einen anderen Nutzer bearbeitet', 'Ok.', {
              duration: 5000,
              panelClass: [`warning-snackbar`],
              verticalPosition: 'top'
            })
          }
        }
      })
    }
    else this.oa_category = {
      label: this.data.oa_category.label,
      is_oa: false
    }
    this.form.patchValue(this.oa_category)
  }

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      id: [''],
      label: ['', Validators.required],
      is_oa: ['']
    });
    this.form.controls.id.disable();
  }

  disable() {
    this.disabled = true;
    this.form.disable();
  }

  action() {
    if (this.form.invalid) return;
    this.oa_category = {...this.oa_category, ...this.form.getRawValue()}
    this.dialogRef.close(this.oa_category)
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
        } else if (this.oa_category.id) this.dialogRef.close({ id: this.oa_category.id, locked_at: null })
        else this.close()
      });
    } else if (this.oa_category.id) this.dialogRef.close({ id: this.oa_category.id, locked_at: null })
    else this.close()
  }
}



