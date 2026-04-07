import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { filter, firstValueFrom, takeUntil } from 'rxjs';
import { SharedModule } from 'src/app/shared/shared.module';
import { ExportWorkflow } from '../../../../../../../output-interfaces/Workflow';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { WorkflowFormPage } from '../../workflow-form-page.interface';
import { ExportFormFacade } from '../export-form-facade.service';

@Component({
  selector: 'app-export-form-mapping',
  imports: [SharedModule],
  templateUrl: './export-form-mapping.component.html',
  styleUrl: './export-form-mapping.component.css',
})
export class ExportFormMappingComponent implements OnInit, WorkflowFormPage {
  form: FormGroup;
  entity: ExportWorkflow;

  constructor(
    private facade: ExportFormFacade,
    private formBuilder: FormBuilder,
    private errorPresentation: ErrorPresentationService,
  ) { }

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      mapping: [''],
    });

    this.facade.export$
      .pipe(filter((e): e is ExportWorkflow => e != null), takeUntil(this.facade.destroy$))
      .subscribe((workflow) => {
        this.entity = workflow;
        this.form.patchValue({ mapping: workflow.mapping ?? '' }, { emitEvent: false });
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
    this.facade.patch({ mapping: this.form.controls.mapping.value });

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
    this.form.patchValue({ mapping: this.entity.mapping ?? '' }, { emitEvent: false });
    this.form.markAsPristine();
  }

  private showSaveError(error: unknown) {
    this.errorPresentation.applyFieldErrors(this.form, error);
    this.errorPresentation.present(error, { action: 'save', entity: 'Workflow' });
  }
}
