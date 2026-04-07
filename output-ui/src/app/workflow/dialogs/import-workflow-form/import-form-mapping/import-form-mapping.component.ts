import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { filter, firstValueFrom, takeUntil } from 'rxjs';
import { ImportWorkflow } from '../../../../../../../output-interfaces/Workflow';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { SharedModule } from 'src/app/shared/shared.module';
import { WorkflowFormPage } from '../../workflow-form-page.interface';
import { ImportFormFacade } from '../import-form-facade.service';

@Component({
  selector: 'app-import-form-mapping',
  imports: [SharedModule],
  templateUrl: './import-form-mapping.component.html',
  styleUrl: './import-form-mapping.component.css',
})
export class ImportFormMappingComponent implements OnInit, WorkflowFormPage {
  form: FormGroup;
  entity: ImportWorkflow;

  constructor(
    private facade: ImportFormFacade,
    private formBuilder: FormBuilder,
    private errorPresentation: ErrorPresentationService,
  ) { }

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      mapping: [''],
    });

    this.facade.import$
      .pipe(filter((e): e is ImportWorkflow => e != null), takeUntil(this.facade.destroy$))
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
