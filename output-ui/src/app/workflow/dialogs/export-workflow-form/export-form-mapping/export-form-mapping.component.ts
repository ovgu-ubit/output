import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { filter, firstValueFrom, takeUntil } from 'rxjs';
import { SharedModule } from 'src/app/shared/shared.module';
import { ExportWorkflow } from '../../../../../../../output-interfaces/Workflow';
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
    private snackBar: MatSnackBar,
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
    } catch {
      this.showSaveError();
      return false;
    }
  }

  resetFormToFacade(): void {
    this.form.patchValue({ mapping: this.entity.mapping ?? '' }, { emitEvent: false });
    this.form.markAsPristine();
  }

  private showSaveError() {
    this.snackBar.open(
      'Speichern fehlgeschlagen. Bitte Pflichtfelder Bezeichnung und Version pruefen.',
      'OK',
      { duration: 5000, verticalPosition: 'top', panelClass: ['danger-snackbar'] },
    );
  }
}
