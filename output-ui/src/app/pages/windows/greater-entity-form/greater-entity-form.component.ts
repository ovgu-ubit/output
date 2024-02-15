import { AfterViewInit, Component, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { GreaterEntityService } from 'src/app/services/entities/greater-entity.service';
import { GreaterEntity, Identifier } from '../../../../../../output-interfaces/Publication';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-greater-entity-form',
  templateUrl: './greater-entity-form.component.html',
  styleUrls: ['./greater-entity-form.component.css']
})
export class GreaterEntityFormComponent implements OnInit, AfterViewInit {

  public form: FormGroup;
  public idForm: FormGroup;

  ge: GreaterEntity;

  displayedColumns: string[] = ['type', 'value', 'delete'];
  @ViewChild(MatTable) table: MatTable<Identifier>;
  disabled = false;

  constructor(public dialogRef: MatDialogRef<GreaterEntityFormComponent>, public tokenService: AuthorizationService,
    @Inject(MAT_DIALOG_DATA) public data: any, private formBuilder: FormBuilder, private geService: GreaterEntityService, private _snackBar:MatSnackBar,
    private dialog:MatDialog) { }

  ngAfterViewInit(): void {
    if (!this.tokenService.hasRole('writer')) {
      this.disable();
    }
    if (this.data.greater_entity.id) {
      this.geService.getGreaterEntity(this.data.greater_entity.id).subscribe({
        next: data => {
          this.ge = data;
          this.form.patchValue(this.ge)
          if (this.ge.locked_at) {
            this.disable();
            this._snackBar.open('Größere Einheit wird leider gerade durch einen anderen Nutzer bearbeitet', 'Ok.', {
              duration: 5000,
              panelClass: [`warning-snackbar`],
              verticalPosition: 'top'
            })
          }
        }
      })
    }
    else this.ge = {
      label: this.data.greater_entity.label,
      identifiers: []
    }
    this.form.patchValue(this.ge)
  }


  ngOnInit(): void {
    this.form = this.formBuilder.group({
      id: [''],
      label: ['', Validators.required],
      rating: [''],
      is_doaj: [''],
    });
    this.form.controls.id.disable();
    this.idForm = this.formBuilder.group({
      type: ['', Validators.required],
      value: ['', Validators.required]
    })
  }

  disable() {
    this.disabled = true;
    this.form.disable();
    this.idForm.disable();
  }

  action() {
    if (this.form.invalid) return;
    this.ge = { ...this.ge, ...this.form.getRawValue() }
    this.dialogRef.close(this.ge)
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
        } else if (this.ge.id) this.dialogRef.close({ id: this.ge.id, locked_at: null })
        else this.close()
      });
    } else if (this.ge.id) this.dialogRef.close({ id: this.ge.id, locked_at: null })
    else this.close()
  }

  deleteId(elem) {
    if (this.disabled) return;
    this.ge.identifiers = this.ge.identifiers.filter(e => e.id !== elem.id)
  }
  addId() {
    if (this.disabled) return;
    this.ge.identifiers.push({
      type: this.idForm.get('type').value,
      value: this.idForm.get('value').value
    })
    this.idForm.reset();
    this.table.dataSource = new MatTableDataSource<Identifier>(this.ge.identifiers);
  }
}
