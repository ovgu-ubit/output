import { AfterViewInit, Component, Input, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { concatMap, map, Observable, of, startWith } from 'rxjs';
import { EntityService } from 'src/app/interfaces/service';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { PublisherService } from 'src/app/services/entities/publisher.service';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';
import { Alias } from '../../../../../../output-interfaces/Alias';
import { Entity, Identifier, Publisher } from '../../../../../../output-interfaces/Publication';
import { PublisherFormComponent } from '../publisher-form/publisher-form.component';

@Component({
  selector: 'app-abstract-form',
  templateUrl: './abstract-form.component.html',
  styleUrl: './abstract-form.component.css'
})
export class AbstractFormComponent<T extends Entity> implements OnInit, AfterViewInit {

  public form: FormGroup;

  @Input() service: EntityService<T, any>;
  @Input() name: string;
  @Input() fields: { key: string, title: string, type?: string, required?: boolean }[];
  @Input() dialogRef: MatDialogRef<any>;
  @Input() data: any;
  @Input() preProcessing?: Observable<any>

  aliasForm: FormGroup = this.formBuilder.group({
    alias: ['', Validators.required]
  });
  idForm = this.formBuilder.group({
    type: ['', Validators.required],
    value: ['', Validators.required]
  })
  prefixForm = this.formBuilder.group({
    doi_prefix: ['', Validators.required],
  });

  entity: T;
  disabled: boolean;
  today = new Date();

  publisherForm = PublisherFormComponent;

  @ViewChild(MatTable) table: MatTable<Alias<T>>;
  @ViewChild(MatTable) idTable: MatTable<Identifier>;
  @ViewChild('table_doi') tableDOI: MatTable<any>;

  constructor(public tokenService: AuthorizationService,
    private formBuilder: FormBuilder,
    private _snackBar: MatSnackBar, private dialog: MatDialog,
    public publisherService: PublisherService) { }

  ngAfterViewInit(): void {
    if (!this.preProcessing) this.preProcessing = of(null);
    this.preProcessing.pipe(concatMap(data => {
      if (!this.tokenService.hasRole('writer') && !this.tokenService.hasRole('admin')) {
        this.disable();
      }
      if (this.data.entity?.id) {
        this.form.controls.id.disable();
        return this.service.getOne(this.data.entity.id).pipe(map(data => {
          this.entity = data;
          this.form.patchValue(this.entity)
          if (this.entity.locked_at) {
            this.disable();
            this._snackBar.open(`${this.name} wird leider gerade durch einen anderen Nutzer bearbeitet`, 'Ok.', {
              duration: 5000,
              panelClass: [`warning-snackbar`],
              verticalPosition: 'top'
            })
          }
        }
        ))
      } else {
        this.fields = this.fields.filter(e => e.key !== 'id' || e.type === 'status')
        if (this.data.entity?.label) this.form.get('label').setValue(this.data.entity.label)
        this.entity = {} as any
        return of(null)
      }
    })).subscribe();
  }

  publishers: Publisher[];
  filtered_publishers: Observable<Publisher[]>;

  ngOnInit(): void {
    let group = {};
    for (let field of this.fields) {
      if (field.type !== 'publisher') group[field.key] = field.required ? ['', Validators.required] : ['']
    }

    this.form = this.formBuilder.group(group);
  }

  disable() {
    this.disabled = true;
    this.form.disable();
    this.aliasForm.disable();
    this.idForm.disable();
  }

  action() {
    if (this.form.invalid) return;
    this.entity = { ...this.entity, ...this.form.getRawValue() }
    //doaj_since: this.form.get('doaj_since').value ? this.form.get('doaj_since').value.format() : undefined
    for (let field of this.fields) if (!this.entity[field.key]) this.entity[field.key] = undefined;
    this.dialogRef.close({ ...this.entity, updated: true })
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
        } else if (this.entity?.id) this.dialogRef.close({ id: this.entity.id, locked_at: null })
        else this.close()
      });
    } else if (this.entity?.id) this.dialogRef.close({ id: this.entity.id, locked_at: null })
    else this.close()
  }

  deleteAlias(elem: Alias<T>) {
    if (this.disabled) return;
    this.entity.aliases = this.entity.aliases.filter((e) => e.alias !== elem.alias)
  }

  addAlias() {
    if (this.disabled) return;
    if (this.aliasForm.invalid) return;
    if (!this.entity.aliases) this.entity.aliases = [];
    this.entity.aliases.push({
      alias: this.aliasForm.get('alias').value.toLocaleLowerCase().trim(),
      elementId: this.entity.id
    })
    this.aliasForm.reset();
    if (this.table) this.table.dataSource = new MatTableDataSource<Alias<T>>(this.entity.aliases);
  }

  deleteId(elem) {
    if (this.disabled) return;
    this.entity.identifiers = this.entity.identifiers.filter(e => e.id !== elem.id)
  }
  addId() {
    if (this.disabled || this.idForm.invalid) return;
    if (!this.entity.identifiers) this.entity.identifiers = [];
    this.entity.identifiers.push({
      type: this.idForm.get('type').value,
      value: this.idForm.get('value').value
    })
    this.idForm.reset();
    if (this.table) this.idTable.dataSource = new MatTableDataSource<Identifier>(this.entity.identifiers);
  }

  deletePrefix(elem: any) {
    if (this.disabled) return;
    this.entity.doi_prefixes = this.entity.doi_prefixes.filter((e) => e.doi_prefix !== elem.doi_prefix)
  }

  addPrefix() {
    if (this.disabled) return;
    if (this.prefixForm.invalid) return;
    this.entity.doi_prefixes.push({
      doi_prefix: this.prefixForm.get('doi_prefix').value.toLocaleLowerCase().trim(),
      //publisherId: this.entity.id
    })
    this.prefixForm.reset();
    if (this.tableDOI) this.tableDOI.dataSource = new MatTableDataSource<any>(this.entity.doi_prefixes);
  }

  setPublisher(event) {
    this.entity['publisher'] = event;
  }
}
