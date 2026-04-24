import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { filter, firstValueFrom, takeUntil } from 'rxjs';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { FilterViewComponent } from 'src/app/publications/dialogs/filter-view/filter-view.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { CompareOperation, SearchFilter, SearchFilterValue } from '../../../../../../../output-interfaces/Config';
import { ValidationCompareCondition, ValidationCondition, ValidationRule, ValidationRuleResult, ValidationWorkflow } from '../../../../../../../output-interfaces/Workflow';
import { WorkflowFormPage } from '../../workflow-form-page.interface';
import { ValidationFormFacade } from '../validation-form-facade.service';

type ValidationRuleType = ValidationRule['type'];
type ConditionGroupName = 'if' | 'then';
type FieldType = 'string' | 'number' | 'date' | 'boolean';

interface ValidationFieldOption {
  path: string;
  label: string;
  type: FieldType;
}

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
  targetFilter: SearchFilter = { expressions: [] };
  private targetFilterDirty = false;

  readonly ruleTypes: { type: ValidationRuleType, label: string }[] = [
    { type: 'required', label: 'Pflichtfeld' },
    { type: 'compare', label: 'Vergleich' },
    { type: 'conditional', label: 'Wenn/Dann' },
  ];

  readonly results: { value: ValidationRuleResult, label: string }[] = [
    { value: 'error', label: 'Fehler' },
    { value: 'warning', label: 'Warnung' },
    { value: 'info', label: 'Info' },
  ];

  readonly compareOps: { op: CompareOperation, label: string, type: FieldType[] }[] = [
    { op: CompareOperation.INCLUDES, label: 'enthält', type: ['string'] },
    { op: CompareOperation.EQUALS, label: 'ist genau', type: ['string', 'number', 'date', 'boolean'] },
    { op: CompareOperation.STARTS_WITH, label: 'beginnt mit', type: ['string'] },
    { op: CompareOperation.GREATER_THAN, label: 'größer als', type: ['number', 'date'] },
    { op: CompareOperation.SMALLER_THAN, label: 'kleiner als', type: ['number', 'date'] },
    { op: CompareOperation.IN, label: 'ist in Liste', type: ['string', 'number', 'boolean'] },
  ];

  readonly fields: ValidationFieldOption[] = [
    { path: 'id', label: 'ID', type: 'number' },
    { path: 'title', label: 'Titel', type: 'string' },
    { path: 'doi', label: 'DOI', type: 'string' },
    { path: 'authors', label: 'Autor*innen-Angabe', type: 'string' },
    { path: 'authorPublications.author.last_name', label: 'Nachname einer Person', type: 'string' },
    { path: 'authorPublications.author.first_name', label: 'Vorname einer Person', type: 'string' },
    { path: 'authorPublications.institute.label', label: 'Institut einer Person', type: 'string' },
    { path: 'authorPublications.corresponding', label: 'Korrespondierende Person', type: 'boolean' },
    { path: 'pub_date', label: 'Publikationsdatum', type: 'date' },
    { path: 'pub_date_accepted', label: 'Datum der Akzeptanz', type: 'date' },
    { path: 'pub_date_submitted', label: 'Datum der Einreichung', type: 'date' },
    { path: 'pub_date_print', label: 'Publikationsdatum (print)', type: 'date' },
    { path: 'pub_type.label', label: 'Publikationstyp', type: 'string' },
    { path: 'oa_category.label', label: 'OA-Kategorie', type: 'string' },
    { path: 'greater_entity.label', label: 'Größere Einheit', type: 'string' },
    { path: 'publisher.label', label: 'Verlag', type: 'string' },
    { path: 'contract.label', label: 'Vertrag', type: 'string' },
    { path: 'funders.label', label: 'Förderer', type: 'string' },
    { path: 'invoices.number', label: 'Rechnungsnummer', type: 'string' },
    { path: 'invoices.date', label: 'Rechnungsdatum', type: 'date' },
    { path: 'invoices.booking_amount', label: 'Buchungsbetrag', type: 'number' },
    { path: 'invoices.cost_center.label', label: 'Kostenstelle', type: 'string' },
    { path: 'invoices.cost_items.cost_type.label', label: 'Kostenart', type: 'string' },
    { path: 'dataSource', label: 'Datenquelle', type: 'string' },
    { path: 'language.label', label: 'Sprache', type: 'string' },
    { path: 'second_pub', label: 'Zweitveröffentlichung', type: 'string' },
    { path: 'add_info', label: 'Weitere Informationen', type: 'string' },
    { path: 'locked', label: 'Gesperrt', type: 'boolean' },
    { path: 'status', label: 'Status', type: 'number' },
    { path: 'is_oa', label: 'Open Access', type: 'boolean' },
    { path: 'oa_status', label: 'OA-Status', type: 'string' },
    { path: 'best_oa_license', label: 'Beste OA-Lizenz', type: 'string' },
    { path: 'abstract', label: 'Abstract', type: 'string' },
    { path: 'volume', label: 'Volume', type: 'string' },
    { path: 'issue', label: 'Issue', type: 'string' },
    { path: 'first_page', label: 'Erste Seite', type: 'string' },
    { path: 'last_page', label: 'Letzte Seite', type: 'string' },
    { path: 'page_count', label: 'Seitenzahl', type: 'number' },
    { path: 'peer_reviewed', label: 'Peer-Reviewed', type: 'boolean' },
    { path: 'cost_approach', label: 'Kostenansatz', type: 'number' },
    { path: 'cost_approach_currency', label: 'Währung Kostenansatz', type: 'string' },
    { path: 'not_budget_relevant', label: 'Nicht budgetrelevant', type: 'boolean' },
    { path: 'grant_number', label: 'Förderkennzeichen', type: 'string' },
    { path: 'contract_year', label: 'Vertragsjahr', type: 'number' },
    { path: 'identifiers.value', label: 'Identifikator', type: 'string' },
    { path: 'supplements.link', label: 'Supplement-Link', type: 'string' },
  ];

  private readonly valueRequiredValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined) return { required: true };
    if (typeof value === 'string' && value.trim().length === 0) return { required: true };
    return null;
  };

  constructor(
    private formBuilder: FormBuilder,
    private facade: ValidationFormFacade,
    private snackBar: MatSnackBar,
    private errorPresentation: ErrorPresentationService,
    private dialog: MatDialog,
  ) { }

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      target: ['publication', Validators.required],
      rules: this.formBuilder.array([]),
    });

    this.facade.validation$
      .pipe(filter((e): e is ValidationWorkflow => e != null), takeUntil(this.facade.destroy$))
      .subscribe((e) => {
        this.entity = e;
        this.targetFilter = this.cloneSearchFilter(e.target_filter ?? { expressions: [] });
        this.targetFilterDirty = false;
        this.replaceRules(e.rules ?? []);
        this.form.patchValue({ target: e.target ?? 'publication' }, { emitEvent: false });
        this.form.markAsPristine();
        if (this.entity.published_at || this.entity.deleted_at) this.form.disable();
        else this.form.enable();
      });
  }

  async action() {
    await this.persistFormToBackend();
  }

  reset() {
    this.resetFormToFacade();
  }

  hasPendingChanges(): boolean {
    return (this.form?.dirty ?? false) || this.targetFilterDirty;
  }

  async persistFormToBackend(): Promise<boolean> {
    if (!this.entity?.label?.trim()) {
      this.snackBar.open('Bitte geben Sie unter "Allgemein" zuerst einen Namen für den Workflow ein.', 'OK', {
        duration: 6000,
        verticalPosition: 'top',
        panelClass: ['danger-snackbar'],
      });
      return false;
    }

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.snackBar.open('Bitte prüfen Sie die markierten Regel-Felder.', 'OK', {
        duration: 5000,
        verticalPosition: 'top',
        panelClass: ['danger-snackbar'],
      });
      return false;
    }

    const targetFilter = this.cloneSearchFilter(this.targetFilter);
    const rules = this.buildRules();

    this.facade.patch({
      target: this.form.get('target')?.value,
      target_filter: targetFilter,
      rules,
    });

    try {
      await firstValueFrom(this.facade.save());
      this.targetFilter = this.cloneSearchFilter(targetFilter);
      this.replaceRules(rules);
      this.targetFilterDirty = false;
      this.form.markAsPristine();
      return true;
    } catch (error) {
      this.showSaveError(error);
      return false;
    }
  }

  resetFormToFacade(): void {
    this.targetFilter = this.cloneSearchFilter(this.entity?.target_filter ?? { expressions: [] });
    this.targetFilterDirty = false;
    this.replaceRules(this.entity?.rules ?? []);
    this.form.patchValue({ target: this.entity?.target ?? 'publication' }, { emitEvent: false });
    this.form.markAsPristine();
  }

  get rules(): FormArray {
    return this.form.get('rules') as FormArray;
  }

  getRulesControls(): FormGroup[] {
    return this.rules.controls as FormGroup[];
  }

  getConditionArray(rule: FormGroup, groupName: ConditionGroupName): FormArray {
    return rule.get(groupName) as FormArray;
  }

  getConditionControls(rule: FormGroup, groupName: ConditionGroupName): FormGroup[] {
    return this.getConditionArray(rule, groupName).controls as FormGroup[];
  }

  addRule(type: ValidationRuleType = 'required'): void {
    this.rules.push(this.createRuleGroup({ type } as ValidationRule));
    this.form.markAsDirty();
  }

  deleteRule(index: number): void {
    this.rules.removeAt(index);
    this.form.markAsDirty();
  }

  addCondition(rule: FormGroup, groupName: ConditionGroupName, condition?: ValidationCondition): void {
    this.getConditionArray(rule, groupName).push(this.createConditionGroup(condition));
    this.form.markAsDirty();
  }

  deleteCondition(rule: FormGroup, groupName: ConditionGroupName, index: number): void {
    this.getConditionArray(rule, groupName).removeAt(index);
    this.form.markAsDirty();
  }

  setRuleType(rule: FormGroup, type: ValidationRuleType): void {
    rule.patchValue({ path: '', comp: CompareOperation.EQUALS, value: '' }, { emitEvent: false });
    this.getConditionArray(rule, 'if').clear();
    this.getConditionArray(rule, 'then').clear();
    if (type === 'conditional') {
      this.addCondition(rule, 'if', { type: 'compare', path: '', comp: CompareOperation.EQUALS, value: '' });
      this.addCondition(rule, 'then', { type: 'required', path: '' });
    }
    this.applyRuleValidators(rule);
  }

  setConditionType(condition: FormGroup): void {
    condition.patchValue({ comp: CompareOperation.EQUALS, value: '' }, { emitEvent: false });
    this.applyConditionValidators(condition);
  }

  editTargetFilter(): void {
    const dialogRef = this.dialog.open(FilterViewComponent, {
      width: '800px',
      maxHeight: '800px',
      disableClose: false,
      data: {
        hideSavedFilters: true,
        viewConfig: {
          filter: {
            filter: this.cloneSearchFilter(this.targetFilter),
            paths: [],
          },
        },
      },
    });

    dialogRef.afterClosed().subscribe((result: { filter?: SearchFilter } | null) => {
      if (!result) return;
      this.targetFilter = this.cloneSearchFilter(result.filter ?? { expressions: [] });
      this.targetFilterDirty = true;
      this.form.markAsDirty();
    });
  }

  resetTargetFilter(): void {
    this.targetFilter = { expressions: [] };
    this.targetFilterDirty = true;
    this.form.markAsDirty();
  }

  get targetFilterSummary(): string {
    const expressionCount = this.targetFilter?.expressions?.length ?? 0;
    if (expressionCount === 0) return 'Kein Target-Filter aktiv';
    return `${expressionCount} Feldfilter`;
  }

  isRequiredRule(rule: FormGroup): boolean {
    return rule.get('type')?.value === 'required';
  }

  isCompareRule(rule: FormGroup): boolean {
    return rule.get('type')?.value === 'compare';
  }

  isConditionalRule(rule: FormGroup): boolean {
    return rule.get('type')?.value === 'conditional';
  }

  isCompareCondition(condition: FormGroup): boolean {
    return condition.get('type')?.value === 'compare';
  }

  isBooleanField(path: string): boolean {
    return this.getFieldType(path) === 'boolean';
  }

  isNumberField(path: string): boolean {
    return this.getFieldType(path) === 'number';
  }

  isListComparison(group: FormGroup): boolean {
    return group.get('comp')?.value === CompareOperation.IN;
  }

  showTextValue(group: FormGroup): boolean {
    return !this.isListComparison(group) && !this.isBooleanField(group.get('path')?.value);
  }

  showBooleanValue(group: FormGroup): boolean {
    return !this.isListComparison(group) && this.isBooleanField(group.get('path')?.value);
  }

  displayCompareOp(group: FormGroup, op: { op: CompareOperation, type: FieldType[] }): boolean {
    return op.type.includes(this.getFieldType(group.get('path')?.value));
  }

  normalizeCompareOperator(group: FormGroup): void {
    const fieldType = this.getFieldType(group.get('path')?.value);
    const available = this.compareOps.filter((op) => op.type.includes(fieldType));
    const selected = group.get('comp')?.value;
    if (!available.some((op) => op.op === selected)) {
      group.get('comp')?.setValue(available[0]?.op ?? CompareOperation.EQUALS);
    }
  }

  trackByIndex(index: number): number {
    return index;
  }

  private showSaveError(error: unknown) {
    this.errorPresentation.applyFieldErrors(this.form, error, {
      pathMap: {
        'target_filter': 'target',
        'rules': 'rules',
      },
    });
    this.errorPresentation.present(error, { action: 'save', entity: 'Workflow' });
  }

  private replaceRules(rules: ValidationRule[]): void {
    this.rules.clear();
    rules.forEach((rule) => this.rules.push(this.createRuleGroup(rule)));
  }

  private createRuleGroup(rule?: ValidationRule): FormGroup {
    const type = rule?.type ?? 'required';
    const group = this.formBuilder.group({
      type: [type, Validators.required],
      result: [(rule as ValidationRule | undefined)?.result ?? 'error', Validators.required],
      path: ['path' in (rule ?? {}) ? (rule as any).path : ''],
      comp: ['comp' in (rule ?? {}) ? (rule as ValidationCompareCondition).comp : CompareOperation.EQUALS],
      value: ['value' in (rule ?? {}) ? this.toFormValue((rule as ValidationCompareCondition).value) : ''],
      negate: ['negate' in (rule ?? {}) ? !!(rule as ValidationCompareCondition).negate : false],
      if: this.formBuilder.array([]),
      then: this.formBuilder.array([]),
    });

    if (type === 'conditional') {
      this.asConditionList((rule as any)?.if).forEach((condition) => this.getConditionArray(group, 'if').push(this.createConditionGroup(condition)));
      this.asConditionList((rule as any)?.then).forEach((condition) => this.getConditionArray(group, 'then').push(this.createConditionGroup(condition)));
      if (this.getConditionArray(group, 'if').length === 0) this.getConditionArray(group, 'if').push(this.createConditionGroup({ type: 'compare', path: '', comp: CompareOperation.EQUALS, value: '' }));
      if (this.getConditionArray(group, 'then').length === 0) this.getConditionArray(group, 'then').push(this.createConditionGroup({ type: 'required', path: '' }));
    }

    this.applyRuleValidators(group);
    return group;
  }

  private createConditionGroup(condition?: ValidationCondition): FormGroup {
    const group = this.formBuilder.group({
      type: [condition?.type ?? 'required', Validators.required],
      path: [condition?.path ?? '', Validators.required],
      comp: [(condition as ValidationCompareCondition | undefined)?.comp ?? CompareOperation.EQUALS],
      value: ['value' in (condition ?? {}) ? this.toFormValue((condition as ValidationCompareCondition).value) : ''],
      negate: ['negate' in (condition ?? {}) ? !!(condition as ValidationCompareCondition).negate : false],
    });
    this.applyConditionValidators(group);
    return group;
  }

  private applyRuleValidators(rule: FormGroup): void {
    const type = rule.get('type')?.value as ValidationRuleType;
    const path = rule.get('path');
    const comp = rule.get('comp');
    const value = rule.get('value');

    path?.clearValidators();
    comp?.clearValidators();
    value?.clearValidators();

    if (type === 'required' || type === 'compare') path?.setValidators([Validators.required]);
    if (type === 'compare') {
      comp?.setValidators([Validators.required]);
      value?.setValidators([this.valueRequiredValidator]);
    }

    path?.updateValueAndValidity({ emitEvent: false });
    comp?.updateValueAndValidity({ emitEvent: false });
    value?.updateValueAndValidity({ emitEvent: false });
  }

  private applyConditionValidators(condition: FormGroup): void {
    const comp = condition.get('comp');
    const value = condition.get('value');
    comp?.clearValidators();
    value?.clearValidators();
    if (condition.get('type')?.value === 'compare') {
      comp?.setValidators([Validators.required]);
      value?.setValidators([this.valueRequiredValidator]);
    }
    comp?.updateValueAndValidity({ emitEvent: false });
    value?.updateValueAndValidity({ emitEvent: false });
  }

  private buildRules(): ValidationRule[] {
    return this.getRulesControls().map((rule) => {
      const type = rule.get('type')?.value as ValidationRuleType;
      const result = rule.get('result')?.value as ValidationRuleResult;
      if (type === 'conditional') {
        return {
          type,
          result,
          if: this.buildConditions(rule, 'if'),
          then: this.buildConditions(rule, 'then'),
        };
      }
      if (type === 'compare') {
        return {
          type,
          result,
          path: rule.get('path')?.value,
          comp: rule.get('comp')?.value,
          value: this.parseFormValue(rule),
          negate: !!rule.get('negate')?.value,
        };
      }
      return {
        type,
        result,
        path: rule.get('path')?.value,
      };
    });
  }

  private buildConditions(rule: FormGroup, groupName: ConditionGroupName): ValidationCondition[] {
    return this.getConditionControls(rule, groupName).map((condition) => {
      if (condition.get('type')?.value === 'compare') {
        return {
          type: 'compare',
          path: condition.get('path')?.value,
          comp: condition.get('comp')?.value,
          value: this.parseFormValue(condition),
          negate: !!condition.get('negate')?.value,
        };
      }
      return {
        type: 'required',
        path: condition.get('path')?.value,
      };
    });
  }

  private asConditionList(value?: ValidationCondition | ValidationCondition[]): ValidationCondition[] {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  private cloneSearchFilter(value: SearchFilter): SearchFilter {
    return {
      expressions: (value?.expressions ?? []).map((expression) => ({ ...expression })),
    };
  }

  private getFieldType(path: string): FieldType {
    return this.fields.find((field) => field.path === path)?.type ?? 'string';
  }

  private parseFormValue(group: FormGroup): SearchFilterValue {
    const path = group.get('path')?.value;
    const fieldType = this.getFieldType(path);
    const value = group.get('value')?.value;

    if (group.get('comp')?.value === CompareOperation.IN) {
      const values = Array.isArray(value) ? value : `${value ?? ''}`.split(/[\n,]+/);
      return values
        .map((entry) => this.parseSingleValue(fieldType, typeof entry === 'string' ? entry.trim() : entry))
        .filter((entry): entry is string | number | boolean => entry !== null && entry !== '');
    }

    return this.parseSingleValue(fieldType, value);
  }

  private parseSingleValue(fieldType: FieldType, value: unknown): string | number | boolean | null {
    if (fieldType === 'boolean') return value === true || `${value}`.toLowerCase() === 'true';
    if (fieldType === 'number') {
      const numberValue = Number(value);
      return Number.isNaN(numberValue) ? 0 : numberValue;
    }
    return value === null || value === undefined ? '' : String(value);
  }

  private toFormValue(value: SearchFilterValue): string | number | boolean {
    return Array.isArray(value) ? value.join(',') : value ?? '';
  }
}
