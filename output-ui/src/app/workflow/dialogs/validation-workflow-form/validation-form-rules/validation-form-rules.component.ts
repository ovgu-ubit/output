import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { filter, firstValueFrom, takeUntil } from 'rxjs';
import { SearchFilter } from '../../../../../../../output-interfaces/Config';
import { ValidationRule, ValidationWorkflow } from '../../../../../../../output-interfaces/Workflow';
import { SharedModule } from 'src/app/shared/shared.module';
import { WorkflowFormPage } from '../../workflow-form-page.interface';
import { ValidationFormFacade } from '../validation-form-facade.service';

@Component({
  selector: 'app-validation-form-rules',
  templateUrl: './validation-form-rules.component.html',
  styleUrl: './validation-form-rules.component.css',
  standalone: true,
  imports: [SharedModule]
})
export class ValidationFormRulesComponent implements OnInit, WorkflowFormPage {
  public form: FormGroup;
  entity: ValidationWorkflow;
  readonly exampleJson = `[
  { "type": "required", "result": "error", "path": "doi" },
  { "type": "compare", "result": "warning", "path": "status", "comp": 1, "value": 1 },
  {
    "type": "conditional",
    "result": "error",
    "if": { "type": "compare", "path": "oa_category", "comp": 1, "value": "gold" },
    "then": { "type": "required", "path": "license" }
  }
]`;

  constructor(
    private formBuilder: FormBuilder,
    private facade: ValidationFormFacade,
    private snackBar: MatSnackBar,
  ) { }

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      target: ['publication', Validators.required],
      target_filter_json: ['{\n  "expressions": []\n}'],
      rules_json: ['[]', Validators.required],
    });

    this.facade.validation$
      .pipe(filter((e): e is ValidationWorkflow => e != null), takeUntil(this.facade.destroy$))
      .subscribe((e) => {
        this.entity = e;
        this.form.patchValue({
          target: e.target ?? 'publication',
          target_filter_json: this.stringifyJson(e.target_filter ?? { expressions: [] }),
          rules_json: this.stringifyJson(e.rules ?? []),
        }, { emitEvent: false });
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
    const targetFilter = this.parseJson<SearchFilter>(
      this.form.get('target_filter_json')?.value,
      { expressions: [] },
      'Target-Filter'
    );
    if (!targetFilter) return false;

    const rules = this.parseJson<ValidationRule[]>(
      this.form.get('rules_json')?.value,
      [],
      'Regeln'
    );
    if (!rules) return false;

    this.facade.patch({
      target: this.form.get('target')?.value,
      target_filter: targetFilter,
      rules,
    });

    try {
      await firstValueFrom(this.facade.save());
      this.form.patchValue({
        target_filter_json: this.stringifyJson(targetFilter),
        rules_json: this.stringifyJson(rules),
      }, { emitEvent: false });
      this.form.markAsPristine();
      return true;
    } catch {
      this.showSaveError();
      return false;
    }
  }

  resetFormToFacade(): void {
    this.form.patchValue({
      target: this.entity?.target ?? 'publication',
      target_filter_json: this.stringifyJson(this.entity?.target_filter ?? { expressions: [] }),
      rules_json: this.stringifyJson(this.entity?.rules ?? []),
    }, { emitEvent: false });
    this.form.markAsPristine();
  }

  private parseJson<T>(value: string | null | undefined, fallback: T, label: string): T | null {
    const trimmed = `${value ?? ''}`.trim();
    if (!trimmed) return fallback;

    try {
      return JSON.parse(trimmed) as T;
    } catch {
      this.snackBar.open(label + ' enthaelt kein gueltiges JSON.', 'OK', {
        duration: 5000,
        verticalPosition: 'top',
        panelClass: ['danger-snackbar'],
      });
      return null;
    }
  }

  private stringifyJson(value: unknown): string {
    return JSON.stringify(value, null, 2);
  }

  private showSaveError() {
    this.snackBar.open(
      'Speichern fehlgeschlagen. Bitte Target, Filter und Regeln pruefen.',
      'OK',
      { duration: 5000, verticalPosition: 'top', panelClass: ['danger-snackbar'] },
    );
  }
}
