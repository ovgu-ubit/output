import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatChipListbox } from '@angular/material/chips';
import {
  CompareOperation,
  getPublicationFilterFieldDefinition,
  getPublicationFilterOperationsForType,
  JoinOperation,
  PUBLICATION_FILTER_FIELD_DEFINITIONS,
  PUBLICATION_FILTER_OPERATIONS_BY_TYPE,
  PublicationFilterFieldDefinition,
  PublicationFilterFieldType,
  PublicationFilterOptionalField,
  SearchFilter,
  SearchFilterExpression,
  SearchFilterValue,
} from '@output/interfaces';
import { ConfigService } from 'src/app/administration/services/config.service';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { SharedModule } from 'src/app/shared/shared.module';

@Component({
  selector: 'app-filter-view',
  templateUrl: './filter-view.component.html',
  styleUrls: ['./filter-view.component.css'],
  standalone: true,
  imports: [SharedModule],
})
export class FilterViewComponent implements OnInit {

  form: FormGroup;
  filters: { path: string, label: string }[];
  selected = [];

  @ViewChild(MatChipListbox) chips: MatChipListbox;

  joinOps: { op: JoinOperation, label: string, showFirst?: boolean }[] = [
    { op: JoinOperation.AND, label: 'Und' },
    { op: JoinOperation.OR, label: 'Oder' },
    { op: JoinOperation.AND_NOT, label: '(Und) Nicht', showFirst: true }
  ]

  compareOps: { op: CompareOperation, label: string, type: PublicationFilterFieldType[] }[] = [
    { op: CompareOperation.INCLUDES, label: 'enthält', type: this.getTypesForOperation(CompareOperation.INCLUDES) },
    { op: CompareOperation.EQUALS, label: 'ist genau', type: this.getTypesForOperation(CompareOperation.EQUALS) },
    { op: CompareOperation.STARTS_WITH, label: 'beginnt mit', type: this.getTypesForOperation(CompareOperation.STARTS_WITH) },
    { op: CompareOperation.GREATER_THAN, label: 'größer als', type: this.getTypesForOperation(CompareOperation.GREATER_THAN) },
    { op: CompareOperation.SMALLER_THAN, label: 'kleiner als', type: this.getTypesForOperation(CompareOperation.SMALLER_THAN) },
    { op: CompareOperation.IN, label: 'ist einer von (komma-getrennt)', type: this.getTypesForOperation(CompareOperation.IN) },
  ]

  optional_fields: Partial<Record<PublicationFilterOptionalField, boolean>> = {};
  keys: PublicationFilterFieldDefinition[] = this.getVisibleFilterFields();

  private readonly valueRequiredValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    return this.hasFilterValue(control.value) ? null : { required: true };
  };

  constructor(
    private formBuilder: FormBuilder,
    public dialogRef: MatDialogRef<FilterViewComponent>,
    private publicationService: PublicationService,
    private configService: ConfigService,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) { }

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      filters: this.formBuilder.array([])
    })
    this.addRow(true);

    this.configService.get("optional_fields").subscribe({
      next: data => {
        this.optional_fields = data.value ?? {};
        this.keys = this.getVisibleFilterFields();
      }
    })

    if (!this.data.hideSavedFilters) {
      this.publicationService.getFilters().subscribe({
        next: data => {
          this.filters = data;
          if (this.data.viewConfig?.filter?.paths && this.data.viewConfig?.filter.paths.length > 0) {
            for (let e of this.data.viewConfig?.filter.paths) {
              let idx = this.filters.findIndex(f => f.path === e);
              if (idx >= 0) {
                this.selected[this.filters[idx].path] = true;
              }
            }
          }
        }
      })
    }

    if (this.data.viewConfig?.filter && this.data.viewConfig?.filter.filter.expressions.length > 0) {
      let i = 0;
      for (let e of this.data.viewConfig?.filter.filter.expressions) {
        if (i !== 0) this.addRow(false);
        const filter = this.getFiltersControls()[i];
        filter.get('join_operator').setValue(e.op)
        filter.get('field').setValue(this.getCanonicalFilterKey(e.key))
        filter.get('compare_operator').setValue(e.comp)
        this.normalizeCompareOperator(filter)
        filter.get('value').setValue(this.getFormValue(e.value))
        i++;
      }
    }

  }

  getFilters() {
    return this.form.controls['filters'] as FormArray;
  }

  getFiltersControls() {
    return (this.form.controls['filters'] as FormArray).controls as unknown as FormGroup[];
  }

  addRow(first: boolean) {
    let filterForm: FormGroup = first ? this.formBuilder.group({
      join_operator: [''],
      field: ['', Validators.required],
      compare_operator: ['', Validators.required],
      value: ['', this.valueRequiredValidator],
    })
      : this.formBuilder.group({
        join_operator: ['', Validators.required],
        field: ['', Validators.required],
        compare_operator: ['', Validators.required],
        value: ['', this.valueRequiredValidator],
      });
    filterForm.get('compare_operator').setValue(this.compareOps[0].op)
    filterForm.get('field').valueChanges.subscribe(() => this.normalizeCompareOperator(filterForm));
    this.getFilters().push(filterForm)
  }

  deleteRow(index: number) {
    this.getFilters().removeAt(index);
  }

  abort() {
    this.dialogRef.close(null);
  }

  action(): void {
    this.form.markAllAsTouched();

    let chips = [];
    if (!this.data.hideSavedFilters && this.chips?.selected) {
      if (!Array.isArray(this.chips.selected)) chips = [this.chips.selected.value]
      else chips = this.chips.selected.map(e => e.value);
    }

    if (this.form.invalid && chips.length === 0) return;

    this.dialogRef.close({ filter: this.getFilter(), paths: chips })
  }

  reset(): void {
    this.dialogRef.close({ filter: { expressions: [] }, paths: [] })
  }

  resetForm(): void {
    this.form = this.formBuilder.group({
      filters: this.formBuilder.array([])
    })
    this.addRow(true);
    if (this.chips?.selected) {
      if (Array.isArray(this.chips.selected)) this.chips.selected.forEach(i => {
        i.deselect();
      });
      else this.chips.selected.select();
    }
  }

  getFilter(): SearchFilter {
    let res: SearchFilter = { expressions: [] }

    for (let filter of this.getFiltersControls()) {
      if (!filter.get('field').value || !this.hasFilterValue(filter.get('value').value)) continue;
      const field = filter.get('field').value;
      const compareOperator = filter.get('compare_operator').value;
      let expression: SearchFilterExpression = {
        op: filter.get('join_operator').value && filter.get('join_operator').value !== 'null' ? filter.get('join_operator').value : JoinOperation.AND,
        key: field,
        comp: compareOperator,
        value: this.getValue(field, filter.get('value').value, compareOperator)
      }
      res.expressions.push(expression)
    }

    return res;
  }

  getValue(key, value, compareOperator?: CompareOperation): any {
    if (compareOperator === CompareOperation.IN) return this.getListValue(key, value);

    const fieldType = this.getFieldType(key);
    if (fieldType === 'boolean') {
      if (typeof value === 'boolean') return value;
      value = String(value).toLowerCase();
      if (value.includes('true') || value.includes('wahr') || value.includes('1') || value.includes('ja')) return true;
      else return false;
    }
    if (fieldType === 'number' || fieldType === 'id' || fieldType === 'year') {
      return this.parseNumberValue(value);
    }
    return value;
  }

  isBoolean(idx: number): boolean {
    if (!this.getFiltersControls()[idx].get('field').value) return false;
    return this.getFieldType(this.getFiltersControls()[idx].get('field').value) === 'boolean';
  }

  display(idx: number, op: { op: CompareOperation, label: string, type?: PublicationFilterFieldType[] }): boolean {
    if (!this.getFiltersControls()[idx].get('field').value) return true;
    return this.getAllowedCompareOperations(this.getFiltersControls()[idx].get('field').value).includes(op.op);
  }

  date(idx: number) {
    if (!this.getFiltersControls()[idx].get('field').value) return false;
    return this.getFieldType(this.getFiltersControls()[idx].get('field').value) === 'date'
  }

  private getListValue(key: string, value: any): Array<string | number | boolean> {
    const fieldType = this.getFieldType(key);
    const values = Array.isArray(value) ? value : String(value ?? '').split(/[\n,]+/);

    return values
      .map(entry => this.parseListEntry(fieldType, typeof entry === 'string' ? entry.trim() : entry))
      .filter((entry): entry is string | number | boolean => entry !== null && entry !== '');
  }

  private parseListEntry(fieldType: PublicationFilterFieldType, value: any): string | number | boolean | null {
    if (fieldType === 'number' || fieldType === 'id' || fieldType === 'year') {
      if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return null;
      const numberValue = Number(value);
      return Number.isNaN(numberValue) ? String(value) : numberValue;
    }

    if (fieldType === 'boolean') {
      if (typeof value === 'boolean') return value;
      value = String(value).toLowerCase();
      if (value.includes('true') || value.includes('wahr') || value.includes('1') || value.includes('ja')) return true;
      if (value.includes('false') || value.includes('falsch') || value.includes('0') || value.includes('nein')) return false;
      return null;
    }

    return value === null || value === undefined ? '' : String(value);
  }

  private normalizeCompareOperator(filter: FormGroup): void {
    const field = filter.get('field').value;
    if (!field) return;

    const compareOperator = filter.get('compare_operator');
    const validOps = this.getAllowedCompareOperations(field);
    if (!validOps.includes(compareOperator.value)) {
      compareOperator.setValue(validOps[0] ?? CompareOperation.EQUALS);
    }
  }

  private getFieldType(key: string): PublicationFilterFieldType {
    return getPublicationFilterFieldDefinition(key)?.type ?? 'string';
  }

  private getAllowedCompareOperations(key: string): CompareOperation[] {
    return getPublicationFilterOperationsForType(this.getFieldType(key));
  }

  private getTypesForOperation(operation: CompareOperation): PublicationFilterFieldType[] {
    return Object.entries(PUBLICATION_FILTER_OPERATIONS_BY_TYPE)
      .filter(([, operations]) => operations.includes(operation))
      .map(([type]) => type as PublicationFilterFieldType);
  }

  private getVisibleFilterFields(): PublicationFilterFieldDefinition[] {
    return PUBLICATION_FILTER_FIELD_DEFINITIONS.filter((field) => {
      return !field.optionalField || this.optional_fields[field.optionalField] === true;
    });
  }

  private getCanonicalFilterKey(key: string): string {
    return getPublicationFilterFieldDefinition(key)?.key ?? key;
  }

  private getFormValue(value: SearchFilterValue): string | number | boolean {
    return Array.isArray(value) ? value.join(',') : value ?? '';
  }

  private parseNumberValue(value: any): number | any {
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return value;
    const numberValue = Number(value);
    return Number.isNaN(numberValue) ? value : numberValue;
  }

  private hasFilterValue(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'string') return value.trim().length > 0;
    return true;
  }
}
