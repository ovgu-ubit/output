import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { filter, firstValueFrom, takeUntil } from 'rxjs';
import { SharedModule } from 'src/app/shared/shared.module';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import {  ExportDisposition, ExportEndpointStrategy, ExportFormat, ExportStrategy, ExportWorkflow  } from '@output/interfaces';
import { WorkflowFormPage } from '../../workflow-form-page.interface';
import { ExportFormFacade } from '../export-form-facade.service';
import { RuntimeConfigService } from 'src/app/services/runtime-config.service';

type ExportStrategyData = Partial<ExportEndpointStrategy>;

@Component({
  selector: 'app-export-form-strategy',
  imports: [SharedModule, ClipboardModule],
  templateUrl: './export-form-strategy.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './export-form-strategy.component.css',
})
export class ExportFormStrategyComponent implements OnInit, WorkflowFormPage {
  private readonly runtimeConfig = inject(RuntimeConfigService);
  private readonly document = inject(DOCUMENT);
  readonly endpointStrategy = ExportStrategy.ENDPOINT;
  readonly endpointRequestExample = JSON.stringify({
    filter: { expressions: [{ op: 0, key: 'title', comp: 0, value: 'test' }] }, paths: [],
  }, null, 2);
  constructor(
    private formBuilder: FormBuilder,
    private facade: ExportFormFacade,
    private errorPresentation: ErrorPresentationService,
  ) { }

  selectionForm: FormGroup;
  strategyForm: FormGroup;
  entity: ExportWorkflow;

  strategies = [
    { value: ExportStrategy.HTTP_RESPONSE, label: 'HTTP-Response', id: 'http-response' },
    { value: ExportStrategy.ENDPOINT, label: 'Endpoint-Export', id: 'endpoint' },
  ];

  exportFormats: { value: ExportFormat, label: string }[] = [
    { value: 'json', label: 'JSON' },
    { value: 'xml', label: 'XML' },
    { value: 'csv', label: 'CSV' },
    { value: 'xlsx', label: 'XLSX' },
  ];

  dispositions: { value: ExportDisposition, label: string }[] = [
    { value: 'inline', label: 'Im Browser anzeigen (inline)' },
    { value: 'attachment', label: 'Als Datei herunterladen' },
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
      endpoint_name: [''],
      access: ['authenticated'],
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
          endpoint_name: strategy.endpoint_name ?? '',
          access: strategy.access ?? 'authenticated',
        }, { emitEvent: false });
        this.updateEndpointValidators();
        this.selectionForm.markAsPristine();
        this.strategyForm.markAsPristine();

        if (this.entity.published_at || this.entity.deleted_at) {
          this.selectionForm.disable();
          this.strategyForm.disable();
        }
      });

    this.selectionForm.controls.strategy.valueChanges
      .pipe(takeUntil(this.facade.destroy$))
      .subscribe(() => this.updateEndpointValidators());

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

  get isEndpoint(): boolean {
    return this.selectionForm?.controls.strategy.value === ExportStrategy.ENDPOINT;
  }

  get isPublicationSource(): boolean {
    return (this.entity?.source_entity ?? 'publication') === 'publication';
  }

  get endpointUrl(): string {
    const name = this.strategyForm?.controls.endpoint_name.value;
    if (!name) return '';
    const api = this.runtimeConfig.getValue<string>('api');
    const base = new URL(api.endsWith('/') ? api : `${api}/`, this.document.baseURI);
    return new URL(`workflow/export/api/${encodeURIComponent(name)}`, base).href;
  }

  get endpointStatus(): string {
    if (this.entity?.deleted_at) return 'Archiviert – der Endpunkt ist nicht erreichbar.';
    if (this.entity?.published_at) return 'Veröffentlicht – der Endpunkt ist aktiv.';
    return 'Entwurf – der Endpunkt wird mit der Veröffentlichung aktiv.';
  }

  private updateEndpointValidators(): void {
    this.strategyForm.controls.endpoint_name.setValidators(this.isEndpoint
      ? [Validators.required, Validators.maxLength(100), Validators.pattern(/^[a-z][a-z0-9-]*$/)] : []);
    this.strategyForm.controls.access.setValidators(this.isEndpoint ? [Validators.required] : []);
    this.strategyForm.controls.endpoint_name.updateValueAndValidity({ emitEvent: false });
    this.strategyForm.controls.access.updateValueAndValidity({ emitEvent: false });
  }

  async action() {
    await this.persistFormToBackend();
  }

  reset() {
    this.resetFormToFacade();
  }

  hasPendingChanges(): boolean {
    return (this.selectionForm?.dirty ?? false) || (this.strategyForm?.dirty ?? false);
  }

  async persistFormToBackend(): Promise<boolean> {
    if (this.selectionForm.invalid || this.strategyForm.invalid || (this.isEndpoint && !this.isPublicationSource)) {
      this.selectionForm.markAllAsTouched();
      this.strategyForm.markAllAsTouched();
      return false;
    }

    this.facade.patch({
      strategy_type: this.selectionForm.controls.strategy.value,
      strategy: this.buildStrategyPayload(this.strategyForm.getRawValue())
    });

    try {
      await firstValueFrom(this.facade.save());
      this.selectionForm.markAsPristine();
      this.strategyForm.markAsPristine();
      return true;
    } catch (error) {
      this.showSaveError(error);
      return false;
    }
  }

  resetFormToFacade(): void {
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
      endpoint_name: strategy.endpoint_name ?? '',
      access: strategy.access ?? 'authenticated',
    }, { emitEvent: false });
    this.updateEndpointValidators();
    this.selectionForm.markAsPristine();
    this.strategyForm.markAsPristine();
  }

  private buildStrategyPayload(value: Record<string, unknown>): Record<string, unknown> {
    const response = this.buildResponseStrategyPayload(value);
    return this.isEndpoint ? {
      ...response, endpoint_name: value.endpoint_name, access: value.access ?? 'authenticated',
    } : response;
  }

  private buildResponseStrategyPayload(value: Record<string, unknown>): Record<string, unknown> {
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

  private showSaveError(error: unknown) {
    this.errorPresentation.applyFieldErrors(this.strategyForm, error, { pathPrefixes: ['strategy.'] });
    this.errorPresentation.present(error, { action: 'save', entity: 'Workflow' });
  }
}
