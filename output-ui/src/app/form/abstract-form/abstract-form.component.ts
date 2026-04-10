import { AfterViewInit, Component, inject, Input, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { concatMap, firstValueFrom, map, Observable, of } from 'rxjs';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { EntityService } from 'src/app/services/entities/service.interface';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { CostTypeService } from 'src/app/services/entities/cost-type.service';
import { PublisherService } from 'src/app/services/entities/publisher.service';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/shared/confirm-dialog/confirm-dialog.component';
import { Entity } from '../../../../../output-interfaces/Publication';
import { CostTypeFormComponent } from '../cost-type-form/cost-type-form.component';
import { PublisherFormComponent } from '../publisher-form/publisher-form.component';
import { AliasTableComponent } from 'src/app/shared/alias-table/alias-table.component';
import { IdTableComponent } from 'src/app/shared/id-table/id-table.component';

@Component({
    selector: 'app-abstract-form',
    templateUrl: './abstract-form.component.html',
    styleUrl: './abstract-form.component.css',
    standalone: false
})
export class AbstractFormComponent<T extends Entity> implements OnInit, AfterViewInit {

  public form: FormGroup;

  @Input() service: EntityService<T, any>;
  @Input() name: string;
  @Input() fields: { key: string, title: string, type?: string, required?: boolean, pattern?: RegExp, select?: string[] }[];
  @Input() dialogRef: MatDialogRef<any>;
  @Input() data: any;
  @Input() preProcessing?: Observable<any>
  @Input() postProcessing?: Observable<any>

  entity: T;
  disabled: boolean;
  saving = false;
  today = new Date();

  publisherForm = PublisherFormComponent;
  ctForm = CostTypeFormComponent;

  @ViewChild('table_doi') tableDOI: MatTable<any>;
  @ViewChild(AliasTableComponent) aliasTable: AliasTableComponent<T>;
  @ViewChild(IdTableComponent) idTable: IdTableComponent<T>;

  public tokenService = inject(AuthorizationService);
  formBuilder = inject(FormBuilder)
  _snackBar = inject(MatSnackBar)
  public publisherService = inject(PublisherService)
  public ctService = inject(CostTypeService)
  dialog = inject(MatDialog)
  errorPresentation = inject(ErrorPresentationService)

  prefixForm = this.formBuilder.group({
    doi_prefix: ['', Validators.required],
  });

  ngAfterViewInit(): void {
    if (!this.preProcessing) this.preProcessing = of(null);
    if (!this.postProcessing) this.postProcessing = of(null);
    this.preProcessing.pipe(concatMap(data => {
      if ((!this.tokenService.hasRole('writer') && !this.tokenService.hasRole('admin')) || this.data?.locked) {
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
        if (!this.fields) this.fields = [];
        this.fields = this.fields.filter(e => e.key !== 'id' || e.type === 'status')
        if (this.data.entity) {
          for (let field of this.fields) {
            if (this.data.entity[field.key]) this.form.get(field.key)?.setValue(this.data.entity[field.key])
          }
          this.entity = this.data.entity as any
        } else this.entity = {} as any
        return of(null)
      }
    }), concatMap(data => {return this.postProcessing})).subscribe({
      error: (error) => {
        this.errorPresentation.present(error, { action: 'load', entity: this.name });
        this.dialogRef.close(null);
      }
    });
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

  async action() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.saving) return;
    if (this.aliasTable && this.aliasTable.isDirty() || (this['aliasForm'] && this['aliasForm'].dirty)) {
      let dialogData = new ConfirmDialogModel("Ungesicherte Änderungen", `Es gibt einen ungespeicherten Alias, möchten Sie diesen zunächst speichern?`);

      let dialogRef = this.dialog.open(ConfirmDialogComponent, {
        maxWidth: "400px",
        data: dialogData,
        disableClose: true
      });

      let dialogResult = await firstValueFrom(dialogRef.afterClosed())
      if (dialogResult) { //save
        if (!this['aliasForm']) this.aliasTable.addAlias();
        else this['addAlias']();
      }
    }
    if (this.idTable && this.idTable.isDirty()) {
      let dialogData = new ConfirmDialogModel("Ungesicherte Änderungen", `Es gibt einen ungespeicherten Identifier, möchten Sie diesen zunächst speichern?`);

      let dialogRef = this.dialog.open(ConfirmDialogComponent, {
        maxWidth: "400px",
        data: dialogData,
        disableClose: true
      });

      let dialogResult = await firstValueFrom(dialogRef.afterClosed())
      if (dialogResult) { //save
        this.idTable.addId();
      }
    }
    if (this.prefixForm && this.prefixForm.dirty) {
      let dialogData = new ConfirmDialogModel("Ungesicherte Änderungen", `Es gibt einen ungespeicherten Präfix, möchten Sie diesen zunächst speichern?`);

      let dialogRef = this.dialog.open(ConfirmDialogComponent, {
        maxWidth: "400px",
        data: dialogData,
        disableClose: true
      });

      let dialogResult = await firstValueFrom(dialogRef.afterClosed())
      if (dialogResult) { //save
        this.addPrefix();
      }
    }
    const isUpdate = !!this.entity?.id;
    this.entity = this.buildEntityPayload(isUpdate);

    if (!this.shouldPersistOnSave()) {
      this.dialogRef.close({ ...this.entity, updated: true })
      return;
    }

    this.saving = true;
    this.errorPresentation.clearFieldErrors(this.form);

    try {
      const response = await firstValueFrom(isUpdate
        ? this.service.update(this.entity)
        : this.service.add(this.entity));
      const savedEntity = this.normalizeSavedEntity(response, this.entity);
      this.dialogRef.close({
        persisted: true,
        mode: isUpdate ? 'update' : 'create',
        entity: savedEntity,
      });
    } catch (error) {
      this.errorPresentation.applyFieldErrors(this.form, error);
      this.errorPresentation.present(error, {
        action: isUpdate ? 'save' : 'create',
        entity: this.name,
      });
    } finally {
      this.saving = false;
    }
  }

  close() {
    if (this.shouldReleaseLockOnClose()) {
      this.dialogRef.close({ id: this.entity.id, locked_at: null });
      return;
    }
    this.dialogRef.close(null)
  }

  abort() {
    if (this.form.dirty) {
      let dialogData = new ConfirmDialogModel("Ungesicherte Änderungen", `Es gibt ungespeicherte Änderungen, möchten Sie diese zunächst speichern?`);

      let dialogRef = this.dialog.open(ConfirmDialogComponent, {
        maxWidth: "400px",
        data: dialogData,
        disableClose: true
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

  getFieldError(key: string, fallback?: string): string | null {
    const control = this.form?.get(key);
    if (!control || (!control.touched && !control.dirty)) return null;
    if (typeof control.errors?.['apiMessage'] === 'string') return control.errors['apiMessage'];
    if (control.hasError('required')) return `${fallback ?? key} ist erforderlich.`;
    if (control.hasError('pattern')) return `${fallback ?? key} hat ein ungueltiges Format.`;
    return null;
  }

  getFormSummaryErrors(): string[] {
    const summary = this.form?.errors?.['apiSummary'];
    return Array.isArray(summary)
      ? summary.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
      : [];
  }

  protected buildEntityPayload(isUpdate: boolean): T {
    const entity = {
      ...this.entity,
      ...this.form.getRawValue(),
    } as T & { id?: number; locked_at?: Date | null };

    for (const field of this.fields) {
      if (entity[field.key] === '') entity[field.key] = null as never;
    }
    if (!entity.id) entity.id = undefined;
    if (isUpdate) entity.locked_at = null;

    return entity as T;
  }

  private shouldPersistOnSave(): boolean {
    return !!this.service && this.data?.persistOnSave === true;
  }

  protected normalizeSavedEntity(response: unknown, fallback: T): T {
    if (Array.isArray(response)) {
      return (response[0] ?? fallback) as T;
    }
    return (response ?? fallback) as T;
  }

  private shouldReleaseLockOnClose(): boolean {
    const canWrite = this.tokenService.hasRole('writer') || this.tokenService.hasRole('admin');
    return !!this.service
      && !!this.entity?.id
      && canWrite
      && !this.entity?.locked_at;
  }
}
