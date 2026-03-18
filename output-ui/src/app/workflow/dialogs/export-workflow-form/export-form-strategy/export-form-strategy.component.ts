import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { filter, takeUntil } from 'rxjs';
import { SharedModule } from 'src/app/shared/shared.module';
import { ExportDisposition, ExportFormat, ExportStrategy, ExportWorkflow } from '../../../../../../../output-interfaces/Workflow';
import { ExportFormFacade } from '../export-form-facade.service';

@Component({
  selector: 'app-export-form-strategy',
  imports: [
    SharedModule
  ],
  templateUrl: './export-form-strategy.component.html',
  styleUrl: './export-form-strategy.component.css',
})
export class ExportFormStrategyComponent implements OnInit {
  constructor(private formBuilder: FormBuilder, private facade: ExportFormFacade) { }

  selectionForm: FormGroup;
  strategyForm: FormGroup;
  entity: ExportWorkflow;

  strategies = [
    { value: ExportStrategy.HTTP_RESPONSE, label: 'HTTP-Response', id: 'http-response' },
  ];

  exportFormats: { value: ExportFormat, label: string }[] = [
    { value: 'json', label: 'JSON' },
    { value: 'xml', label: 'XML' },
    { value: 'csv', label: 'CSV' },
    { value: 'xlsx', label: 'XLSX' },
  ];

  dispositions: { value: ExportDisposition, label: string }[] = [
    { value: 'inline', label: 'Inline' },
    { value: 'attachment', label: 'Download' },
  ];

  ngOnInit(): void {
    this.selectionForm = this.formBuilder.group({
      strategy: this.formBuilder.nonNullable.control<ExportStrategy>(ExportStrategy.HTTP_RESPONSE),
    });

    this.strategyForm = this.formBuilder.group({
      format: ['json', Validators.required],
      disposition: ['inline', Validators.required],
      delimiter: [';'],
      quote_char: ['"'],
      root_name: ['export'],
      sheet_name: ['Export'],
    });

    this.facade.export$
      .pipe(filter((e): e is ExportWorkflow => e != null), takeUntil(this.facade.destroy$))
      .subscribe((e) => {
        this.entity = e;
        this.selectionForm.patchValue({ strategy: e.strategy_type ?? ExportStrategy.HTTP_RESPONSE }, { emitEvent: false });
        this.strategyForm.patchValue({
          format: e.strategy?.format ?? 'json',
          disposition: e.strategy?.disposition ?? ((e.strategy?.format ?? 'json') === 'xlsx' ? 'attachment' : 'inline'),
          delimiter: e.strategy?.delimiter ?? ';',
          quote_char: e.strategy?.quote_char ?? '"',
          root_name: e.strategy?.root_name ?? 'export',
          sheet_name: e.strategy?.sheet_name ?? 'Export',
        }, { emitEvent: false });

        if (this.entity.published_at || this.entity.deleted_at) {
          this.selectionForm.disable();
          this.strategyForm.disable();
        }
      });

    this.strategyForm.controls.format.valueChanges
      .pipe(takeUntil(this.facade.destroy$))
      .subscribe((format: ExportFormat) => {
        const disposition = this.strategyForm.controls.disposition.value;
        if (format === 'xlsx' && disposition !== 'attachment') {
          this.strategyForm.controls.disposition.setValue('attachment');
        }
      });
  }

  get selectedFormat(): ExportFormat {
    return this.strategyForm.controls.format.value;
  }

  action() {
    if (this.selectionForm.invalid || this.strategyForm.invalid) {
      this.selectionForm.markAllAsTouched();
      this.strategyForm.markAllAsTouched();
      return;
    }
    this.facade.patch({
      strategy_type: this.selectionForm.controls.strategy.value,
      strategy: this.sanitizeStrategyPayload(this.strategyForm.getRawValue())
    });
  }

  reset() {
    this.selectionForm.patchValue({ strategy: this.entity.strategy_type ?? ExportStrategy.HTTP_RESPONSE }, { emitEvent: false });
    this.strategyForm.patchValue({
      format: this.entity.strategy?.format ?? 'json',
      disposition: this.entity.strategy?.disposition ?? ((this.entity.strategy?.format ?? 'json') === 'xlsx' ? 'attachment' : 'inline'),
      delimiter: this.entity.strategy?.delimiter ?? ';',
      quote_char: this.entity.strategy?.quote_char ?? '"',
      root_name: this.entity.strategy?.root_name ?? 'export',
      sheet_name: this.entity.strategy?.sheet_name ?? 'Export',
    }, { emitEvent: false });
  }

  private sanitizeStrategyPayload(value: Record<string, unknown>) {
    return Object.fromEntries(
      Object.entries(value).filter(([, entry]) => entry !== null && entry !== undefined && entry !== '')
    );
  }
}
