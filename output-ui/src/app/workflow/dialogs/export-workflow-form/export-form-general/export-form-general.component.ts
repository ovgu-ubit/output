import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { filter, firstValueFrom, takeUntil } from 'rxjs';
import { SharedModule } from 'src/app/shared/shared.module';
import {  ExportWorkflow  } from '@output/interfaces';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { WorkflowFormPage } from '../../workflow-form-page.interface';
import { ExportFormFacade } from '../export-form-facade.service';
import { EXPORT_ENTITY_OPTIONS } from '../../../export-entity-options';

@Component({
  selector: 'app-export-form-general',
  templateUrl: './export-form-general.component.html',
  styleUrl: './export-form-general.component.css',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [SharedModule]
})
export class ExportFormGeneralComponent implements OnInit, WorkflowFormPage {
  public form: FormGroup;
  entity: ExportWorkflow;
  readonly entityOptions = EXPORT_ENTITY_OPTIONS;

  get sourceChanged(): boolean {
    return !!this.entity && this.form?.get('source_entity')?.value !== (this.entity.source_entity ?? 'publication');
  }

  constructor(
    private formBuilder: FormBuilder,
    private facade: ExportFormFacade,
    private errorPresentation: ErrorPresentationService,
  ) { }

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      id: [{ value: '', disabled: true }],
      workflow_id: [{ value: '', disabled: true }],
      label: [''],
      version: [{ value: '', disabled: true }],
      created_at: [{ value: new Date(), disabled: true }],
      modified_at: [{ value: new Date(), disabled: true }],
      published_at: [{ value: new Date(), disabled: true }],
      deleted_at: [{ value: new Date(), disabled: true }],
      description: [''],
      source_entity: ['publication'],
    });

    this.facade.export$
      .pipe(filter((e): e is ExportWorkflow => e != null), takeUntil(this.facade.destroy$))
      .subscribe((e) => {
        this.entity = e;
        this.form.patchValue({ ...e, source_entity: e.source_entity ?? 'publication' }, { emitEvent: false });
        this.form.markAsPristine();
        if (this.entity.published_at || this.entity.deleted_at) this.form.disable();
      });
  }

  async action() {
    await this.persistFormToBackend();
  }

  reset() {
    this.resetFormToFacade();
  }

  hasPendingChanges(): boolean {
    return this.form?.dirty ?? false;
  }

  async persistFormToBackend(): Promise<boolean> {
    const res = {
      id: this.form.get('id')?.value,
      label: this.form.get('label')?.value,
      description: this.form.get('description')?.value,
      source_entity: this.form.get('source_entity')?.value,
    };
    this.facade.patch(res);

    try {
      await firstValueFrom(this.facade.save());
      this.form.markAsPristine();
      return true;
    } catch (error) {
      this.showSaveError(error);
      return false;
    }
  }

  resetFormToFacade(): void {
    this.form.patchValue({ ...this.entity, source_entity: this.entity.source_entity ?? 'publication' }, { emitEvent: false });
    this.form.markAsPristine();
  }

  private showSaveError(error: unknown) {
    this.errorPresentation.applyFieldErrors(this.form, error);
    this.errorPresentation.present(error, { action: 'save', entity: 'Workflow' });
  }
}
