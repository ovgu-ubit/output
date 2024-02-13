import { AfterViewInit, Component, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { Observable, map, startWith } from 'rxjs';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { InstituteService } from 'src/app/services/entities/institute.service';
import { AliasInstitute } from '../../../../../../output-interfaces/Alias';
import { Institute } from '../../../../../../output-interfaces/Publication';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-institute-form',
  templateUrl: './institute-form.component.html',
  styleUrls: ['./institute-form.component.css']
})
export class InstituteFormComponent implements OnInit, AfterViewInit {

  public form: FormGroup;
  public aliasForm: FormGroup;

  institute: Institute;
  institutes: Institute[];
  filtered_super_institutes: Observable<Institute[]>;
  displayedColumns: string[] = ['id', 'label'];
  disabled = false;

  @ViewChild(MatTable) table: MatTable<AliasInstitute>;

  constructor(public dialogRef: MatDialogRef<InstituteFormComponent>, public tokenService: AuthorizationService,
    @Inject(MAT_DIALOG_DATA) public data: any, private formBuilder: FormBuilder, private instService: InstituteService, private _snackBar:MatSnackBar,
    private dialog:MatDialog) { }

  ngAfterViewInit(): void {
    if (!this.tokenService.hasRole('writer')) {
      this.disable();
    }
    if (this.data.institute?.id) {
      this.instService.getInstitute(this.data.institute.id).subscribe({
        next: data => {
          this.institute = data;
          this.form.patchValue(this.institute)
          this.form.get('super_inst').setValue(this.institute.super_institute?.label)
          if (this.institute.locked_at) {
            this.disable();
            this._snackBar.open('Institut wird leider gerade durch einen anderen Nutzer bearbeitet', 'Ok.', {
              duration: 5000,
              panelClass: [`warning-snackbar`],
              verticalPosition: 'top'
            })
          }
        }
      })
    }
    else this.institute = {
      label: this.data.institute.label
    }
    this.instService.getinstitutes().subscribe({
      next: data => {
        this.institutes = data.sort((a, b) => a.label.localeCompare(b.label));
        this.filtered_super_institutes = this.form.get('super_inst').valueChanges.pipe(
          startWith(this.institute?.super_institute?.label),
          map(value => this._filterSuperInst(value || '')),
        );
      }
    })


    this.form.patchValue(this.institute)
  }


  ngOnInit(): void {
    this.form = this.formBuilder.group({
      id: [''],
      title: [''],
      label: ['', Validators.required],
      short_label: [''],
      super_inst: ['']
    });
    this.aliasForm = this.formBuilder.group({
      alias: ['', Validators.required]
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
    this.institute = { ...this.institute, ...this.form.getRawValue() }
    if (!this.institute.id) this.institute.id = undefined;
    this.dialogRef.close(this.institute)
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
        } else this.dialogRef.close({ id: this.institute.id, locked_at: null })
      });
    } else this.dialogRef.close({ id: this.institute.id, locked_at: null })
  }

  selectedSuperInst(event: MatAutocompleteSelectedEvent): void {
    this.addSuperInst(event.option)
  }

  addSuperInst(event) {
    if (this.disabled) return;
    let inst = this.institutes.find(e => e.label.trim().toLowerCase() === event.value.trim().toLowerCase());
    if (!this.institute.sub_institutes?.find(e => e.id === inst.id)) {
      this.institute.super_institute = inst;
      this.form.get('super_inst').setValue(this.institute.super_institute.label);
    } else {
      //TODO error
    }
  }

  private _filterSuperInst(value: string): Institute[] {
    const filterValue = value.toLowerCase();

    return this.institutes.filter(pub => pub?.label.toLowerCase().includes(filterValue) || pub?.short_label?.toLowerCase().includes(filterValue));
  }

  deleteAlias(elem: AliasInstitute) {
    if (this.disabled) return;
    this.institute.aliases = this.institute.aliases.filter((e) => e.alias !== elem.alias)
  }

  addAlias() {
    if (this.disabled) return;
    if (this.aliasForm.invalid) return;
    this.institute.aliases.push({
      alias: this.aliasForm.get('alias').value.toLocaleLowerCase().trim(),
      elementId: this.institute.id
    })
    this.aliasForm.reset();
    this.table.dataSource = new MatTableDataSource<AliasInstitute>(this.institute.aliases);
  }
}
