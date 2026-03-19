import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { filter, takeUntil } from 'rxjs';
import { SharedModule } from 'src/app/shared/shared.module';
import { ExportDisposition, ExportFormat, ExportStrategy, ExportWorkflow } from '../../../../../../../output-interfaces/Workflow';
import { ExportFormFacade } from '../export-form-facade.service';

type ExportStrategyData = {
  format?: ExportFormat;
  disposition?: ExportDisposition;
  delimiter?: string;
  quote_char?: string;
  root_name?: string;
  item_name?: string;
  sheet_name?: string;
};

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
      item_name: ['item'],
      sheet_name: ['Export'],
    });

    this.facade.export$
      .pipe(filter((e): e is ExportWorkflow => e != null), takeUntil(this.facade.destroy$))
      .subscribe((e) => {
        this.entity = e;
        const strategy = this.getStrategy(e);
        this.selectionForm.patchValue({ strategy: e.strategy_type ?? ExportStrategy.HTTP_RESPONSE }, { emitEvent: false });
        this.strategyForm.patchValue({
          format: strategy.format ?? 'json',
          disposition: strategy.disposition ?? ((strategy.format ?? 'json') === 'xlsx' ? 'attachment' : 'inline'),
          delimiter: strategy.delimiter ?? ';',
          quote_char: strategy.quote_char ?? '"',
          root_name: strategy.root_name ?? 'export',
          item_name: strategy.item_name ?? 'item',
          sheet_name: strategy.sheet_name ?? 'Export',
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
      strategy: this.buildStrategyPayload(this.strategyForm.getRawValue())
    });
  }

  reset() {
    const strategy = this.getStrategy(this.entity);
    this.selectionForm.patchValue({ strategy: this.entity.strategy_type ?? ExportStrategy.HTTP_RESPONSE }, { emitEvent: false });
    this.strategyForm.patchValue({
      format: strategy.format ?? 'json',
      disposition: strategy.disposition ?? ((strategy.format ?? 'json') === 'xlsx' ? 'attachment' : 'inline'),
      delimiter: strategy.delimiter ?? ';',
      quote_char: strategy.quote_char ?? '"',
      root_name: strategy.root_name ?? 'export',
      item_name: strategy.item_name ?? 'item',
      sheet_name: strategy.sheet_name ?? 'Export',
    }, { emitEvent: false });
  }

  private buildStrategyPayload(value: Record<string, unknown>): Record<string, unknown> {
    const format = (value.format ?? 'json') as ExportFormat;
    const disposition = (value.disposition ?? (format === 'xlsx' ? 'attachment' : 'inline')) as ExportDisposition;

    switch (format) {
      case 'csv':
        return {
          format,
          disposition,
          delimiter: (value.delimiter as string | undefined) ?? ';',
          quote_char: (value.quote_char as string | undefined) ?? '"',
        };
      case 'xml':
        return {
          format,
          disposition,
          root_name: (value.root_name as string | undefined) ?? 'export',
          item_name: (value.item_name as string | undefined) ?? 'item',
        };
      case 'xlsx':
        return {
          format,
          disposition: 'attachment',
          sheet_name: (value.sheet_name as string | undefined) ?? 'Export',
        };
      case 'json':
      default:
        return {
          format: 'json',
          disposition,
        };
    }
  }

  private getStrategy(entity: ExportWorkflow) {
    return (entity.strategy ?? {}) as ExportStrategyData;
  }
}
