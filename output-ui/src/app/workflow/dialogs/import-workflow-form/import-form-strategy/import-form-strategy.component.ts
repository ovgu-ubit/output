import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { filter, firstValueFrom, takeUntil, tap } from 'rxjs';
import { ImportStrategy, ImportWorkflow } from '../../../../../../../output-interfaces/Workflow';
import { SharedModule } from 'src/app/shared/shared.module';
import { WorkflowFormPage } from '../../workflow-form-page.interface';
import { ImportFormFacade } from '../import-form-facade.service';

@Component({
  selector: 'app-import-form-strategy',
  imports: [SharedModule],
  templateUrl: './import-form-strategy.component.html',
  styleUrl: './import-form-strategy.component.css',
})
export class ImportFormStrategyComponent implements OnInit, WorkflowFormPage {

  constructor(
    private formBuilder: FormBuilder,
    private facade: ImportFormFacade,
    private snackBar: MatSnackBar,
  ) { }

  selectionForm: FormGroup;
  strategyForm: FormGroup = this.formBuilder.group({
    only_import_if_authors_inst: [true],
    format: ['', Validators.required],
    exclusion_criteria: ['', Validators.required]
  });

  entity: ImportWorkflow;
  previousStrategy = ImportStrategy.URL_QUERY_OFFSET;

  strategies = [
    { value: ImportStrategy.URL_QUERY_OFFSET, label: 'Web-Abfrage per Suche und Offset', id: 'offset' },
    { value: ImportStrategy.URL_LOOKUP_AND_RETRIEVE, label: 'Web-Abfrage per Lookup und Einzelabruf', id: 'lookup' },
    { value: ImportStrategy.URL_DOI, label: 'Web-Abfrage per DOI', id: 'doi' },
    { value: ImportStrategy.FILE_UPLOAD, label: 'Datei-Upload', id: 'file' },
  ];

  fileFormats = [
    { value: 'csv', label: 'CSV' },
    { value: 'xlsx', label: 'XLSX' },
  ];

  webFormats = [
    { value: 'json', label: 'JSON' },
    { value: 'xml', label: 'XML' },
  ];

  ngOnInit(): void {
    this.selectionForm = this.formBuilder.group({
      strategy: this.formBuilder.nonNullable.control<ImportStrategy>(ImportStrategy.URL_QUERY_OFFSET),
    });
    this.previousStrategy = this.selectionForm.controls.strategy.value;
    this.strategyForm = this.buildForm(this.previousStrategy);

    this.facade.import$
      .pipe(
        filter((e): e is ImportWorkflow => e != null),
        takeUntil(this.facade.destroy$),
        tap((e) => {
          this.entity = e;
          this.previousStrategy = e.strategy_type;
          this.selectionForm.controls.strategy.setValue(e.strategy_type, { emitEvent: false });
          this.applyStrategy(e.strategy_type);
          this.selectionForm.markAsPristine();
          this.strategyForm.markAsPristine();

          if (this.entity.published_at || this.entity.deleted_at) {
            this.selectionForm.disable();
            this.strategyForm.disable();
          }
        })
      )
      .subscribe();

    this.selectionForm.controls.strategy.valueChanges
      .pipe(takeUntil(this.facade.destroy$))
      .subscribe((next) => {
        if (next === null || next === undefined || next === this.previousStrategy) return;
        this.applyStrategy(next);
      });
  }

  private applyStrategy(next: ImportStrategy) {
    this.strategyForm = this.buildForm(next);
    this.previousStrategy = next;
  }

  get selectedStrategyId(): string {
    return this.strategies.find(e => e.value === this.selectionForm.controls.strategy.value)?.id;
  }

  get selectedFormat(): string {
    return this.strategyForm.controls.format.value;
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
    if (this.selectionForm.invalid || this.strategyForm.invalid) {
      this.selectionForm.markAllAsTouched();
      this.strategyForm.markAllAsTouched();
      return false;
    }

    this.facade.patch({
      strategy_type: this.previousStrategy,
      strategy: this.sanitizeStrategyPayload(this.strategyForm.getRawValue())
    });

    try {
      await firstValueFrom(this.facade.save());
      this.selectionForm.markAsPristine();
      this.strategyForm.markAsPristine();
      return true;
    } catch {
      this.showSaveError();
      return false;
    }
  }

  resetFormToFacade(): void {
    this.previousStrategy = this.entity.strategy_type;
    this.selectionForm.controls.strategy.setValue(this.entity.strategy_type, { emitEvent: false });
    this.applyStrategy(this.entity.strategy_type);
    this.strategyForm.patchValue(this.entity.strategy ?? {}, { emitEvent: false });
    this.selectionForm.markAsPristine();
    this.strategyForm.markAsPristine();
  }

  getLabel(s: ImportStrategy) {
    return this.strategies.find(e => e.value === s)
  }

  private buildForm(key: ImportStrategy): FormGroup {
    let res;
    switch (key) {
      case ImportStrategy.FILE_UPLOAD:
        res = this.formBuilder.group({
          only_import_if_authors_inst: [true],
          format: ['', Validators.required],
          exclusion_criteria: ['', Validators.required],
          quote_char: [''],
          delimiter: [''],
          skip_first_line: [''],
          encoding: ['']
        });
        break;
      case ImportStrategy.URL_DOI:
        res = this.formBuilder.group({
          only_import_if_authors_inst: [true],
          format: ['', Validators.required],
          exclusion_criteria: ['', Validators.required],
          delayInMs: [0, [Validators.min(0), Validators.max(60000)]],
          parallelCalls: [1, [Validators.min(1), Validators.max(20)]],
          url_doi: ['', Validators.required],
          get_doi_item: ['', Validators.required],
        });
        break;
      case ImportStrategy.URL_LOOKUP_AND_RETRIEVE:
        res = this.formBuilder.group({
          only_import_if_authors_inst: [true],
          format: ['', Validators.required],
          exclusion_criteria: ['', Validators.required],
          delayInMs: [0, [Validators.min(0), Validators.max(60000)]],
          parallelCalls: [1, [Validators.min(1), Validators.max(20)]],
          url_lookup: ['', Validators.required],
          url_retrieve: ['', Validators.required],
          max_res: [100, [Validators.required, Validators.min(1), Validators.max(5000)]],
          max_res_name: ['', Validators.required],
          request_mode: ['', Validators.required],
          offset_name: ['', Validators.required],
          offset_start: [0, [Validators.min(0)]],
          search_text_combiner: ['', Validators.required],
          get_count: ['', Validators.required],
          get_lookup_ids: ['', Validators.required],
          get_retrieve_item: ['', Validators.required],
          lookup_format: [null],
          retrieve_format: [null],
        });
        break;
      case ImportStrategy.URL_QUERY_OFFSET:
      default:
        res = this.formBuilder.group({
          only_import_if_authors_inst: [true],
          format: ['', Validators.required],
          exclusion_criteria: ['', Validators.required],
          delayInMs: [0, [Validators.min(0), Validators.max(60000)]],
          parallelCalls: [1, [Validators.min(1), Validators.max(20)]],
          url_count: ['', Validators.required],
          url_items: ['', Validators.required],
          max_res: [100, [Validators.required, Validators.min(1), Validators.max(5000)]],
          max_res_name: ['', Validators.required],
          request_mode: ['', Validators.required],
          offset_name: ['', Validators.required],
          offset_start: [0, [Validators.min(0)]],
          offset_count: [0, [Validators.min(0)]],
          search_text_combiner: ['', Validators.required],
          get_count: ['', Validators.required],
          get_items: ['', Validators.required],
        });
    }
    if (this.entity) {
      res.patchValue(this.entity.strategy, { emitEvent: false });
    }
    return res;
  }

  private sanitizeStrategyPayload(value: Record<string, unknown>) {
    return Object.fromEntries(
      Object.entries(value).filter(([, entry]) => entry !== null && entry !== undefined && entry !== '')
    );
  }

  private showSaveError() {
    this.snackBar.open(
      'Speichern fehlgeschlagen. Bitte Pflichtfelder Bezeichnung und Version pruefen.',
      'OK',
      { duration: 5000, verticalPosition: 'top', panelClass: ['danger-snackbar'] },
    );
  }
}
