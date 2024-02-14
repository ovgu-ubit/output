import { Component, OnInit, Inject,ViewChild,AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Funder } from '../../../../../../output-interfaces/Publication';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { FunderService } from 'src/app/services/entities/funder.service';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { AliasFunder } from '../../../../../../output-interfaces/Alias';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-funder-form',
  templateUrl: './funder-form.component.html',
  styleUrls: ['./funder-form.component.css']
})
export class FunderFormComponent implements OnInit, AfterViewInit {

  public form: FormGroup;
  aliasForm :FormGroup = this.formBuilder.group({
    alias: ['', Validators.required]
  });

  @ViewChild(MatTable) table: MatTable<AliasFunder>;
  disabled = false;

  funder: Funder;

  constructor(public dialogRef: MatDialogRef<FunderFormComponent>, public tokenService: AuthorizationService,
    @Inject(MAT_DIALOG_DATA) public data: any, private formBuilder: FormBuilder, private funderService:FunderService,
    private _snackBar:MatSnackBar, private dialog:MatDialog) {}

  ngAfterViewInit(): void {
    if (!this.tokenService.hasRole('writer')) {
      this.disable();
    }
    if (this.data.funder?.id) {
      this.funderService.getFunder(this.data.funder.id).subscribe({
        next: data => {
          this.funder = data;
          this.form.patchValue(this.funder)
          if (this.funder.locked_at) {
            this.disable();
            this._snackBar.open('Förderer wird leider gerade durch einen anderen Nutzer bearbeitet', 'Ok.', {
              duration: 5000,
              panelClass: [`warning-snackbar`],
              verticalPosition: 'top'
            })
          }
        }
      })
    }
    else this.funder = {
      label : this.data.funder.label,
      aliases: []
    }
    this.form.patchValue(this.funder)
  }

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      id: [''],
      label: ['', Validators.required],
      doi: [''],
    });
    this.form.controls.id.disable();
  }

  disable() {
    this.disabled = true;
    this.form.disable();
    this.aliasForm.disable();
  }

  action() {
    if (this.form.invalid) return;
    this.funder = {...this.funder, ...this.form.getRawValue()}
    if (!this.funder.id) this.funder.id = undefined;
    if (!this.funder.doi) this.funder.doi = undefined;
    this.dialogRef.close(this.funder)
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
        } else if (this.funder.id) this.dialogRef.close({ id: this.funder.id, locked_at: null })
        else this.close()
      });
    } else if (this.funder.id) this.dialogRef.close({ id: this.funder.id, locked_at: null })
    else this.close()
  }

  deleteAlias(elem:AliasFunder) {
    if (this.disabled) return;
    this.funder.aliases = this.funder.aliases.filter((e) => e.alias !== elem.alias)
  }

  addAlias() {
    if (this.disabled) return;
    if (this.aliasForm.invalid) return;
    this.funder.aliases.push({
      alias: this.aliasForm.get('alias').value.toLocaleLowerCase().trim(),
      elementId: this.funder.id
    })
    this.aliasForm.reset();
    if (this.table) this.table.dataSource = new MatTableDataSource<AliasFunder>(this.funder.aliases);
  }
}
