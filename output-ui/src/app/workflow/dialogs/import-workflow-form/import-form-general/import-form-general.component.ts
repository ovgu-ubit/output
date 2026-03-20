import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { filter, firstValueFrom, takeUntil } from 'rxjs';
import { ImportWorkflow } from '../../../../../../../output-interfaces/Workflow';
import { SharedModule } from 'src/app/shared/shared.module';
import { WorkflowFormPage } from '../../workflow-form-page.interface';
import { ImportFormFacade } from '../import-form-facade.service';

@Component({
  selector: 'app-import-form-general',
  templateUrl: './import-form-general.component.html',
  styleUrl: './import-form-general.component.css',
  standalone: true,
  imports: [SharedModule]
})
export class ImportFormGeneralComponent implements OnInit, WorkflowFormPage {

  public form: FormGroup;
  entity: ImportWorkflow;

  constructor(
    private formBuilder: FormBuilder,
    private facade: ImportFormFacade,
    private snackBar: MatSnackBar,
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

    this.facade.import$
      .pipe(filter((e): e is ImportWorkflow => e != null), takeUntil(this.facade.destroy$))
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
    } catch {
      this.showSaveError();
      return false;
    }
  }

  resetFormToFacade(): void {
    this.form.patchValue(this.entity, { emitEvent: false });
    this.form.markAsPristine();
  }

  private showSaveError() {
    this.snackBar.open(
      'Speichern fehlgeschlagen. Bitte Pflichtfelder Bezeichnung und Version prüfen.',
      'OK',
      { duration: 5000, verticalPosition: 'top', panelClass: ['danger-snackbar'] },
    );
  }
}
