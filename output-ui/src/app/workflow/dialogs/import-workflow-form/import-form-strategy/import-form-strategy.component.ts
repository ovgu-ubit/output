import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ImportWorkflow, Strategy } from '../../../../../../../output-interfaces/Workflow';
import { ImportFormFacade } from '../import-form-facade.service';
import { MatSelectModule } from '@angular/material/select';
import { SharedModule } from 'src/app/shared/shared.module';
import { filter, takeUntil, tap } from 'rxjs';

@Component({
  selector: 'app-import-form-strategy',
  imports: [
    SharedModule
  ],
  templateUrl: './import-form-strategy.component.html',
  styleUrl: './import-form-strategy.component.css',
})
export class ImportFormStrategyComponent implements OnInit {

  constructor(private formBuilder: FormBuilder, private facade: ImportFormFacade) { }

  selectionForm: FormGroup;
  strategyForm: FormGroup;

  entity: ImportWorkflow;

  previousStrategy = Strategy.URL_QUERY_OFFSET;

  strategies = [
    {value: Strategy.URL_QUERY_OFFSET, label: 'Web-Abfrage per Suche und Offset', id: 'offset'},
    {value: Strategy.URL_DOI, label: 'Web-Abfrage per DOI', id: 'doi'},
    {value: Strategy.FILE_UPLOAD, label: 'Datei-Upload', id: 'file'},
  ]

  formats = [
    {value: 'json', label: 'JSON'},
    {value: 'xml', label: 'XML'},
    {value: 'csv', label: 'CSV'},
    {value: 'xlsx', label: 'XLSX'},
  ]

  ngOnInit(): void {
    this.selectionForm = this.formBuilder.group({
      strategy: this.formBuilder.nonNullable.control<Strategy>(Strategy.URL_QUERY_OFFSET),
    })
    this.previousStrategy = this.selectionForm.controls.strategy.value;
    this.strategyForm = this.buildForm(this.previousStrategy);

    this.facade.import$.pipe(filter((e): e is ImportWorkflow => e != null), takeUntil(this.facade.destroy$), tap(e => {
      if (!e) return;
      this.entity = e;
      this.previousStrategy = e.strategy_type;
      this.selectionForm.controls.strategy.setValue(e.strategy_type, { emitEvent: false })
      this.applyStrategy(e.strategy_type);
      if (this.entity.published_at || this.entity.deleted_at) {
        this.selectionForm.disable();
        this.strategyForm.disable();
      }
    })
  ).subscribe();

    this.selectionForm.controls.strategy.valueChanges.subscribe(async (next) => {
      if (!next || next === this.previousStrategy) return;
      this.applyStrategy(next);
        return;
    })
  }

  private applyStrategy(next: Strategy) {
    this.strategyForm = this.buildForm(next);
    this.previousStrategy = next;
  }

  get selectedStrategyId(): string {
    return this.strategies.find(e => e.value === this.selectionForm.controls.strategy.value)?.id;
  }

  action() {
    let res = {
      strategy_type: this.previousStrategy,
      strategy: {...this.strategyForm.value}
    }
    this.facade.patch(res);
  }

  reset() {
    this.previousStrategy = this.entity.strategy_type;
      this.selectionForm.controls.strategy.setValue(this.entity.strategy_type, { emitEvent: false })
      this.applyStrategy(this.entity.strategy_type);
    this.strategyForm.patchValue(this.entity)
  }

  getLabel(s:Strategy) {
    return this.strategies.find(e => e.value === s)
  }

  private buildForm(key: Strategy): FormGroup {
    let res;
    switch (key) {
      case Strategy.FILE_UPLOAD:
        res = this.formBuilder.group({
          only_import_if_authors_inst: [true],
          format: ['', Validators.required],
          exclusion_criteria: ['', Validators.required]
        });
        break;
      case Strategy.URL_DOI:
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
      case Strategy.URL_QUERY_OFFSET:
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
          request_mode : ['', Validators.required],
          offset_name : ['', Validators.required],
          offset_start : [0, [Validators.min(0)]],
          offset_count : [0, [Validators.min(0)]],
          search_text_combiner: ['', Validators.required],
          get_count: ['', Validators.required],
          get_items: ['', Validators.required],
        });
    }
    if (this.entity) res.patchValue(this.entity.strategy);
    return res;
  }
}
