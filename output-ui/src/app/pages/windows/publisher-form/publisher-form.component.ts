import { AfterViewInit, Component, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { PublisherService } from 'src/app/services/entities/publisher.service';
import { AliasPublisher } from '../../../../../../output-interfaces/Alias';
import { Publisher, PublisherDOI } from '../../../../../../output-interfaces/Publication';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-publisher-form',
  templateUrl: './publisher-form.component.html',
  styleUrls: ['./publisher-form.component.css']
})
export class PublisherFormComponent implements OnInit, AfterViewInit{

  public form: FormGroup;
  public aliasForm: FormGroup;
  public prefixForm: FormGroup;

  publisher:Publisher;

  @ViewChild('table') table: MatTable<AliasPublisher>;
  @ViewChild('table_doi') tableDOI: MatTable<PublisherDOI>;
  disabled = false;

  constructor(public dialogRef: MatDialogRef<PublisherFormComponent>, public tokenService: AuthorizationService,
    @Inject(MAT_DIALOG_DATA) public data: any, private formBuilder: FormBuilder, private publisherService:PublisherService, private _snackBar:MatSnackBar,
    private dialog:MatDialog) {}

  ngAfterViewInit(): void {
    if (!this.tokenService.hasRole('writer') && !this.tokenService.hasRole('admin')) {
      this.disable();
    }
    if (this.data.publisher.id) {
      this.publisherService.getPublisher(this.data.publisher.id).subscribe({
        next: data => {
          this.publisher = data;
          this.form.patchValue(this.publisher)
          if (this.publisher.locked_at) {
            this.disable();
            this._snackBar.open('Verlag wird leider gerade durch einen anderen Nutzer bearbeitet', 'Ok.', {
              duration: 5000,
              panelClass: [`warning-snackbar`],
              verticalPosition: 'top'
            })
          }
        }
      })
    }
    else this.publisher = {
      label: this.data.publisher.label,
      aliases: []
    }
    this.form.patchValue(this.publisher)
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
      doi_prefix: ['']
    });
    this.form.controls.id.disable();
    
    this.aliasForm = this.formBuilder.group({
      alias: ['', Validators.required]
    });
    this.prefixForm = this.formBuilder.group({
      doi_prefix: ['', Validators.required],
    });
  }

  action() {
    if (this.form.invalid) return;
    this.publisher = {...this.publisher, ...this.form.getRawValue()}
    this.dialogRef.close(this.publisher)
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
        } else if (this.publisher.id) this.dialogRef.close({ id: this.publisher.id, locked_at: null })
        else this.close()
      });
    } else if (this.publisher.id) this.dialogRef.close({ id: this.publisher.id, locked_at: null })
    else this.close()
  }

  deleteAlias(elem:AliasPublisher) {
    if (this.disabled) return;
    this.publisher.aliases = this.publisher.aliases.filter((e) => e.alias !== elem.alias)
  }

  addAlias() {
    if (this.disabled) return;
    if (this.aliasForm.invalid) return;
    this.publisher.aliases.push({
      alias: this.aliasForm.get('alias').value.toLocaleLowerCase().trim(),
      elementId: this.publisher.id
    })
    this.aliasForm.reset();
    if (this.table) this.table.dataSource = new MatTableDataSource<AliasPublisher>(this.publisher.aliases);
  }

  deletePrefix(elem:PublisherDOI) {
    if (this.disabled) return;
    this.publisher.doi_prefixes = this.publisher.doi_prefixes.filter((e) => e.doi_prefix !== elem.doi_prefix)
  }

  addPrefix() {
    if (this.disabled) return;
    if (this.prefixForm.invalid) return;
    this.publisher.doi_prefixes.push({
      doi_prefix: this.prefixForm.get('doi_prefix').value.toLocaleLowerCase().trim(),
      publisherId: this.publisher.id
    })
    this.prefixForm.reset();
    if (this.tableDOI) this.tableDOI.dataSource = new MatTableDataSource<PublisherDOI>(this.publisher.doi_prefixes);
  }
}

