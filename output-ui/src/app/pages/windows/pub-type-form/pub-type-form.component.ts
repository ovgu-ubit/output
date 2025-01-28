import { AfterViewInit, Component, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { PublicationTypeService } from 'src/app/services/entities/publication-type.service';
import { AliasPubType } from '../../../../../../output-interfaces/Alias';
import { PublicationType } from '../../../../../../output-interfaces/Publication';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-pub-type-form',
  templateUrl: './pub-type-form.component.html',
  styleUrls: ['./pub-type-form.component.css']
})
export class PubTypeFormComponent implements OnInit, AfterViewInit {

  public form: FormGroup;
  aliasForm: FormGroup = this.formBuilder.group({
    alias: ['', Validators.required]
  });
  disabled:boolean;

  pub_type: PublicationType;
  @ViewChild(MatTable) table: MatTable<AliasPubType>;

  constructor(public dialogRef: MatDialogRef<PubTypeFormComponent>, public tokenService: AuthorizationService,
    @Inject(MAT_DIALOG_DATA) public data: any, private formBuilder: FormBuilder, private pubTypeService: PublicationTypeService,
    private _snackBar:MatSnackBar, private dialog:MatDialog) { }

  ngAfterViewInit(): void {
    if (!this.tokenService.hasRole('writer') && !this.tokenService.hasRole('admin')) {
      this.disable();
    }
    if (this.data.entity?.id) {
      this.pubTypeService.getOne(this.data.entity.id).subscribe({
        next: data => {
          this.pub_type = data;
          this.form.patchValue(this.pub_type)
          if (this.pub_type.locked_at) {
            this.disable();
            this._snackBar.open('Publikationsart wird leider gerade durch einen anderen Nutzer bearbeitet', 'Ok.', {
              duration: 5000,
              panelClass: [`warning-snackbar`],
              verticalPosition: 'top'
            })
          }
        }
      })
    }
    else this.pub_type = {
      label: this.data.pub_type?.label,
      review: false,
      aliases: []
    }
    this.form.patchValue(this.pub_type)
  }

  disable() {
    this.disabled = true;
    this.form.disable();
    this.aliasForm.disable();
  }

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      id: [''],
      label: ['', Validators.required],
      review: ['']
    });
    this.form.controls.id.disable();
  }

  action() {
    if (this.form.invalid) return;
    this.pub_type = { ...this.pub_type, ...this.form.getRawValue() }
    this.dialogRef.close({...this.pub_type, updated: true})
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
        } else if (this.pub_type.id) this.dialogRef.close({ id: this.pub_type.id, locked_at: null })
        else this.close()
      });
    } else if (this.pub_type.id) this.dialogRef.close({ id: this.pub_type.id, locked_at: null })
    else this.close()
  }

  deleteAlias(elem: AliasPubType) {
    if (this.disabled) return;
    this.pub_type.aliases = this.pub_type.aliases.filter((e) => e.alias !== elem.alias)
  }

  addAlias() {
    if (this.disabled) return;
    if (this.aliasForm.invalid) return;
    this.pub_type.aliases.push({
      alias: this.aliasForm.get('alias').value.toLocaleLowerCase().trim(),
      elementId: this.pub_type.id
    })
    this.aliasForm.reset();
    if (this.table) this.table.dataSource = new MatTableDataSource<AliasPubType>(this.pub_type.aliases);
  }
}


