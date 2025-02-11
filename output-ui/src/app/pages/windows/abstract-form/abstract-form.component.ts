import { AfterViewInit, Component, Input, OnInit, ViewChild, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validator, Validators } from '@angular/forms';
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
import { CostTypeFormComponent } from '../cost-type-form/cost-type-form.component';
import { CostTypeService } from 'src/app/services/entities/cost-type.service';

@Component({
  selector: 'app-abstract-form',
  templateUrl: './abstract-form.component.html',
  styleUrl: './abstract-form.component.css'
})
export class AbstractFormComponent<T extends Entity> implements OnInit, AfterViewInit {

  public form: FormGroup;

  @Input() service: EntityService<T, any>;
  @Input() name: string;
  @Input() fields: { key: string, title: string, type?: string, required?: boolean, pattern?: RegExp, select?: string[] }[];
  @Input() dialogRef: MatDialogRef<any>;
  @Input() data: any;
  @Input() preProcessing?: Observable<any>

  entity: T;
  disabled: boolean;
  today = new Date();

  publisherForm = PublisherFormComponent;
  ctForm = CostTypeFormComponent;

  @ViewChild('table_doi') tableDOI: MatTable<any>;

  public tokenService = inject(AuthorizationService);
  formBuilder = inject(FormBuilder)
  _snackBar = inject(MatSnackBar)
  public publisherService = inject(PublisherService)
  public ctService = inject(CostTypeService)
  dialog = inject(MatDialog)

  prefixForm = this.formBuilder.group({
    doi_prefix: ['', Validators.required],
  });

  ngAfterViewInit(): void {
    if (!this.preProcessing) this.preProcessing = of(null);
    this.preProcessing.pipe(concatMap(data => {
      if ((!this.tokenService.hasRole('writer') && !this.tokenService.hasRole('admin')) || this.data.locked) {
        this.disable();
      }
      if (this.data.entity?.id && this.service) {//edit mode with current db entity
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
      } else if (this.data.entity?.id) { //Edit mode with giving entity
        this.entity = this.data.entity;
        this.form.patchValue(this.entity)
        this.form.controls.id.disable();
        return of(null)
      }
      else {
        this.fields = this.fields.filter(e => e.key !== 'id' || e.type === 'status')
        if (this.data.entity) {
          for (let field of this.fields) {
            if (this.data.entity[field.key]) this.form.get(field.key)?.setValue(this.data.entity[field.key])
          }
          this.entity = this.data.entity as any
        } else this.entity = {} as any
        return of(null)
      }
    })).subscribe();
  }

  ngOnInit(): void {
    let group = {};
    for (let field of this.fields) {
      if (field.type !== 'publisher' && field.type !== 'cost_type') {
        let vals = [];
        if (field.required) vals.push(Validators.required)
        if (field.pattern) vals.push(Validators.pattern(field.pattern))
        group[field.key] = ['', vals]
      }
    }

    this.form = this.formBuilder.group(group);
  }

  disable() {
    this.disabled = true;
    this.form.disable();
  }

  action() {
    if (this.form.invalid) return;
    this.entity = { ...this.entity, ...this.form.getRawValue() }
    //doaj_since: this.form.get('doaj_since').value ? this.form.get('doaj_since').value.format() : undefined
    for (let field of this.fields) if (!this.entity[field.key]) this.entity[field.key] = undefined;
    if (!this.entity.id) this.entity.id = undefined;
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

  deletePrefix(elem: any) {
    if (this.disabled) return;
    this.entity.doi_prefixes = this.entity.doi_prefixes.filter((e) => e.doi_prefix !== elem.doi_prefix)
  }

  addPrefix() {
    if (this.disabled) return;
    if (this.prefixForm.invalid) return;
    if (!this.entity.doi_prefixes) this.entity.doi_prefixes = [];
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

  setCostType(event) {
    this.entity['cost_type'] = event;
  }

  enter(event) {
    if (event.keyCode == 13 && event.srcElement.localName !== 'textarea') return false;
    return true;
  }

  escape(event) {
    if (event.key === 'Escape') {
      this.abort();
      return false;
    }
    return true;
  }
}
