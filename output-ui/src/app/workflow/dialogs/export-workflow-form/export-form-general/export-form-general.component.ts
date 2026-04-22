import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { filter, firstValueFrom, takeUntil } from 'rxjs';
import { SharedModule } from 'src/app/shared/shared.module';
import { ExportWorkflow } from '../../../../../../../output-interfaces/Workflow';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { WorkflowFormPage } from '../../workflow-form-page.interface';
import { ExportFormFacade } from '../export-form-facade.service';

@Component({
  selector: 'app-export-form-general',
  templateUrl: './export-form-general.component.html',
  styleUrl: './export-form-general.component.css',
  standalone: true,
  imports: [SharedModule]
})
export class ExportFormGeneralComponent implements OnInit, WorkflowFormPage {
  public form: FormGroup;
  entity: ExportWorkflow;

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
    });

    this.facade.export$
      .pipe(filter((e): e is ExportWorkflow => e != null), takeUntil(this.facade.destroy$))
      .subscribe((e) => {
        this.entity = e;
        this.form.patchValue(e, { emitEvent: false });
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
    this.form.patchValue(this.entity, { emitEvent: false });
    this.form.markAsPristine();
  }

  private showSaveError(error: unknown) {
    this.errorPresentation.applyFieldErrors(this.form, error);
    this.errorPresentation.present(error, { action: 'save', entity: 'Workflow' });
  }
}
