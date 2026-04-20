import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { filter, firstValueFrom, takeUntil } from 'rxjs';
import { ImportWorkflow } from '../../../../../../../output-interfaces/Workflow';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { SharedModule } from 'src/app/shared/shared.module';
import { WorkflowFormPage } from '../../workflow-form-page.interface';
import { ImportFormFacade } from '../import-form-facade.service';

interface MappingFieldDefinition {
  key: string;
  label: string;
  rows?: number;
  placeholder?: string;
}

interface ParsedMapping {
  common: string;
  fields: Record<string, string>;
  rawFallback: boolean;
}

@Component({
  selector: 'app-import-form-mapping',
  imports: [SharedModule],
  templateUrl: './import-form-mapping.component.html',
  styleUrl: './import-form-mapping.component.css',
})
export class ImportFormMappingComponent implements OnInit, WorkflowFormPage {
  form: FormGroup;
  entity: ImportWorkflow;
  activeFieldKeys: string[] = [];

  readonly mappingFields: MappingFieldDefinition[] = [
    { key: 'title', label: 'Titel', placeholder: '$.title' },
    { key: 'doi', label: 'DOI', placeholder: '$.DOI' },
    { key: 'authors_inst', label: 'Personen der Institution', rows: 7 },
    { key: 'authors', label: 'Autorenangaben' },
    { key: 'pub_type', label: 'Publikationstyp' },
    { key: 'oa_category', label: 'OA-Kategorie' },
    { key: 'greater_entity', label: 'Größere Einheit', rows: 6 },
    { key: 'publisher', label: 'Verlag' },
    { key: 'contract', label: 'Vertrag' },
    { key: 'funder', label: 'Förderer', rows: 6 },
    { key: 'pub_date', label: 'Publikationsdatum' },
    { key: 'pub_date_print', label: 'Publikationsdatum (print)' },
    { key: 'pub_date_accepted', label: 'Akzeptanzdatum' },
    { key: 'pub_date_submitted', label: 'Einreichungsdatum' },
    { key: 'language', label: 'Sprache' },
    { key: 'link', label: 'Link' },
    { key: 'license', label: 'OA-Lizenz' },
    { key: 'status', label: 'Status' },
    { key: 'abstract', label: 'Abstract' },
    { key: 'page_count', label: 'Seitenzahl' },
    { key: 'peer_reviewed', label: 'Peer reviewed' },
    { key: 'cost_approach', label: 'Kostenansatz' },
    { key: 'cost_approach_currency', label: 'Währung Kostenansatz' },
    { key: 'invoices', label: 'Rechnungen' },
    { key: 'volume', label: 'Band' },
    { key: 'issue', label: 'Heft' },
    { key: 'first_page', label: 'Erste Seite' },
    { key: 'last_page', label: 'Letzte Seite' },
    { key: 'publisher_location', label: 'Verlagsort' },
    { key: 'edition', label: 'Auflage' },
    { key: 'article_number', label: 'Artikelnummer' },
    { key: 'is_oa', label: 'Open Access' },
    { key: 'oa_status', label: 'OA-Status' },
    { key: 'is_journal_oa', label: 'Journal Open Access' },
    { key: 'best_oa_host', label: 'Beste OA-Quelle' },
  ];

  private readonly mappingFieldKeys = new Set(this.mappingFields.map((field) => field.key));
  private rawMappingFallback = false;

  constructor(
    private facade: ImportFormFacade,
    private formBuilder: FormBuilder,
    private errorPresentation: ErrorPresentationService,
  ) { }

  ngOnInit(): void {
    this.form = this.createForm();

    this.facade.import$
      .pipe(filter((e): e is ImportWorkflow => e != null), takeUntil(this.facade.destroy$))
      .subscribe((workflow) => {
        this.entity = workflow;
        this.patchFormFromMapping(workflow.mapping ?? '');
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
    this.facade.patch({ mapping: this.mappingFromForm() });

    try {
      await firstValueFrom(this.facade.save());
      this.form.markAsPristine();
      return true;
    } catch (error) {
      this.showSaveError(error);
      return false;
    }
  }

  resetFormToFacade(): void {
    this.patchFormFromMapping(this.entity.mapping ?? '');
    this.form.markAsPristine();
  }

  fieldHasValue(key: string): boolean {
    return !!this.fieldsForm.get(key)?.value?.trim();
  }

  isFieldActive(key: string): boolean {
    return this.activeFieldKeys.includes(key);
  }

  setFieldActive(key: string, active: boolean, userInput = true): void {
    if (active === this.isFieldActive(key)) return;

    this.activeFieldKeys = active
      ? [...this.activeFieldKeys, key]
      : this.activeFieldKeys.filter((fieldKey) => fieldKey !== key);

    if (userInput) this.form.markAsDirty();
  }

  get activeMappingFields(): MappingFieldDefinition[] {
    return this.mappingFields.filter((field) => this.isFieldActive(field.key));
  }

  get canEdit(): boolean {
    return !this.entity?.published_at && !this.entity?.deleted_at;
  }

  getRows(field: MappingFieldDefinition): number {
    return field.rows ?? 3;
  }

  private showSaveError(error: unknown) {
    this.errorPresentation.applyFieldErrors(this.form, error, { pathMap: { mapping: 'common' } });
    this.errorPresentation.present(error, { action: 'save', entity: 'Workflow' });
  }

  private get fieldsForm(): FormGroup {
    return this.form.controls.fields as FormGroup;
  }

  private createForm(): FormGroup {
    const fieldControls = this.mappingFields.reduce((controls, field) => {
      controls[field.key] = [''];
      return controls;
    }, {} as Record<string, string[]>);

    return this.formBuilder.group({
      common: [''],
      fields: this.formBuilder.group(fieldControls),
    });
  }

  private patchFormFromMapping(mapping: string): void {
    const parsed = this.parseMapping(mapping);
    this.rawMappingFallback = parsed.rawFallback;
    this.activeFieldKeys = this.mappingFields
      .filter((field) => !!parsed.fields[field.key]?.trim())
      .map((field) => field.key);
    this.form.patchValue({
      common: parsed.common,
      fields: parsed.fields,
    }, { emitEvent: false });
  }

  private parseMapping(mapping: string): ParsedMapping {
    const emptyFields = this.emptyFieldValues();
    const trimmed = mapping.trim();
    if (!trimmed) return { common: '', fields: emptyFields, rawFallback: false };

    const expression = this.unwrapOuterBlock(trimmed);
    const split = this.extractFinalObjectExpression(expression);
    if (!split) return { common: mapping, fields: emptyFields, rawFallback: true };

    const parsedFields = this.parseObjectFields(split.objectBody);
    if (!parsedFields) return { common: mapping, fields: emptyFields, rawFallback: true };

    const supportedFields = { ...emptyFields };
    Object.entries(parsedFields).forEach(([key, value]) => {
      if (this.mappingFieldKeys.has(key)) supportedFields[key] = value;
    });

    return {
      common: split.common.trim(),
      fields: supportedFields,
      rawFallback: false,
    };
  }

  private mappingFromForm(): string {
    const common = `${this.form.controls.common.value ?? ''}`.trim();
    const fieldEntries = this.mappingFields
      .map((field) => ({ key: field.key, value: `${this.fieldsForm.get(field.key)?.value ?? ''}`.trim() }))
      .filter((field) => this.isFieldActive(field.key) && field.value.length > 0);

    if (this.rawMappingFallback && fieldEntries.length === 0) return common;

    const objectExpression = fieldEntries.length > 0
      ? `{\n${fieldEntries.map((field) => `  "${field.key}": ${field.value}`).join(',\n')}\n}`
      : '{}';

    if (!common) return objectExpression;

    const separator = common.endsWith(';') ? '' : ';';
    return `(\n${common}${separator}\n${objectExpression}\n)`;
  }

  private emptyFieldValues(): Record<string, string> {
    return this.mappingFields.reduce((fields, field) => {
      fields[field.key] = '';
      return fields;
    }, {} as Record<string, string>);
  }

  private unwrapOuterBlock(mapping: string): string {
    if (!mapping.startsWith('(')) return mapping;

    const closingIndex = this.findMatchingBracket(mapping, 0, '(', ')');
    if (closingIndex === mapping.length - 1) return mapping.slice(1, -1).trim();

    return mapping;
  }

  private extractFinalObjectExpression(expression: string): { common: string; objectBody: string } | null {
    const directExpression = expression.trim();
    if (directExpression.startsWith('{')) {
      const closingIndex = this.findMatchingBracket(directExpression, 0, '{', '}');
      if (closingIndex === directExpression.length - 1) {
        return { common: '', objectBody: directExpression.slice(1, -1) };
      }
    }

    const separatorIndex = this.findLastTopLevelSemicolon(expression);
    if (separatorIndex < 0) return null;

    const finalExpression = expression.slice(separatorIndex + 1).trim();
    if (!finalExpression.startsWith('{')) return null;

    const closingIndex = this.findMatchingBracket(finalExpression, 0, '{', '}');
    if (closingIndex !== finalExpression.length - 1) return null;

    return {
      common: expression.slice(0, separatorIndex).trim(),
      objectBody: finalExpression.slice(1, -1),
    };
  }

  private parseObjectFields(objectBody: string): Record<string, string> | null {
    const fields: Record<string, string> = {};
    let cursor = 0;

    while (cursor < objectBody.length) {
      cursor = this.skipWhitespaceCommentsAndCommas(objectBody, cursor);
      if (cursor >= objectBody.length) break;

      const key = this.readObjectKey(objectBody, cursor);
      if (!key) return null;

      cursor = this.skipWhitespaceAndComments(objectBody, key.end);
      if (objectBody[cursor] !== ':') return null;

      const valueStart = cursor + 1;
      const valueEnd = this.findNextTopLevelComma(objectBody, valueStart);
      const value = objectBody.slice(valueStart, valueEnd).trim();
      if (!value) return null;

      fields[key.value] = value;
      cursor = valueEnd + 1;
    }

    return fields;
  }

  private readObjectKey(text: string, start: number): { value: string; end: number } | null {
    const quote = text[start];
    if (quote === '"' || quote === "'") {
      for (let index = start + 1; index < text.length; index++) {
        if (text[index] === quote && !this.isEscaped(text, index)) {
          return {
            value: text.slice(start + 1, index).replace(/\\(["'])/g, '$1'),
            end: index + 1,
          };
        }
      }

      return null;
    }

    let end = start;
    while (end < text.length && /[A-Za-z0-9_$-]/.test(text[end])) end++;
    if (end === start) return null;

    return { value: text.slice(start, end), end };
  }

  private findMatchingBracket(text: string, start: number, open: string, close: string): number {
    let depth = 0;
    let quote: string | null = null;
    let regex = false;
    let blockComment = false;
    let lineComment = false;
    let previousToken = '';

    for (let index = start; index < text.length; index++) {
      const char = text[index];
      const next = text[index + 1];

      if (lineComment) {
        if (char === '\n') lineComment = false;
        continue;
      }

      if (blockComment) {
        if (char === '*' && next === '/') {
          blockComment = false;
          index++;
        }
        continue;
      }

      if (quote) {
        if (char === quote && !this.isEscaped(text, index)) quote = null;
        continue;
      }

      if (regex) {
        if (char === '/' && !this.isEscaped(text, index)) regex = false;
        continue;
      }

      if (char === '/' && next === '*') {
        blockComment = true;
        index++;
        continue;
      }

      if (char === '/' && next === '/') {
        lineComment = true;
        index++;
        continue;
      }

      if (char === '"' || char === "'") {
        quote = char;
        continue;
      }

      if (char === '/' && this.isRegexStart(previousToken)) {
        regex = true;
        continue;
      }

      if (char === open) depth++;
      if (char === close) {
        depth--;
        if (depth === 0) return index;
      }

      if (!/\s/.test(char)) previousToken = char;
    }

    return -1;
  }

  private findLastTopLevelSemicolon(text: string): number {
    let last = -1;
    this.scanTopLevel(text, (char, index, depth) => {
      if (char === ';' && depth.round === 0 && depth.square === 0 && depth.curly === 0) last = index;
    });
    return last;
  }

  private findNextTopLevelComma(text: string, start: number): number {
    let result = text.length;
    this.scanTopLevel(text, (char, index, depth) => {
      if (index < start || result !== text.length) return;
      if (char === ',' && depth.round === 0 && depth.square === 0 && depth.curly === 0) result = index;
    }, start);
    return result;
  }

  private scanTopLevel(
    text: string,
    visitor: (char: string, index: number, depth: { round: number; square: number; curly: number }) => void,
    start = 0,
  ): void {
    const depth = { round: 0, square: 0, curly: 0 };
    let quote: string | null = null;
    let regex = false;
    let blockComment = false;
    let lineComment = false;
    let previousToken = '';

    for (let index = start; index < text.length; index++) {
      const char = text[index];
      const next = text[index + 1];

      if (lineComment) {
        if (char === '\n') lineComment = false;
        continue;
      }

      if (blockComment) {
        if (char === '*' && next === '/') {
          blockComment = false;
          index++;
        }
        continue;
      }

      if (quote) {
        if (char === quote && !this.isEscaped(text, index)) quote = null;
        continue;
      }

      if (regex) {
        if (char === '/' && !this.isEscaped(text, index)) regex = false;
        continue;
      }

      if (char === '/' && next === '*') {
        blockComment = true;
        index++;
        continue;
      }

      if (char === '/' && next === '/') {
        lineComment = true;
        index++;
        continue;
      }

      if (char === '"' || char === "'") {
        quote = char;
        continue;
      }

      if (char === '/' && this.isRegexStart(previousToken)) {
        regex = true;
        continue;
      }

      if (char === '(') depth.round++;
      else if (char === ')') depth.round--;
      else if (char === '[') depth.square++;
      else if (char === ']') depth.square--;
      else if (char === '{') depth.curly++;
      else if (char === '}') depth.curly--;
      else visitor(char, index, depth);

      if (!/\s/.test(char)) previousToken = char;
    }
  }

  private skipWhitespaceCommentsAndCommas(text: string, start: number): number {
    let cursor = start;
    while (cursor < text.length) {
      if (/\s|,/.test(text[cursor])) {
        cursor++;
        continue;
      }

      const next = this.skipComment(text, cursor);
      if (next === cursor) break;
      cursor = next;
    }

    return cursor;
  }

  private skipWhitespaceAndComments(text: string, start: number): number {
    let cursor = start;
    while (cursor < text.length) {
      if (/\s/.test(text[cursor])) {
        cursor++;
        continue;
      }

      const next = this.skipComment(text, cursor);
      if (next === cursor) break;
      cursor = next;
    }

    return cursor;
  }

  private skipComment(text: string, start: number): number {
    if (text[start] === '/' && text[start + 1] === '*') {
      const end = text.indexOf('*/', start + 2);
      return end < 0 ? text.length : end + 2;
    }

    if (text[start] === '/' && text[start + 1] === '/') {
      const end = text.indexOf('\n', start + 2);
      return end < 0 ? text.length : end + 1;
    }

    return start;
  }

  private isRegexStart(previousToken: string): boolean {
    return !previousToken || ['(', '[', '{', ',', ':', ';', '=', '?'].includes(previousToken);
  }

  private isEscaped(text: string, index: number): boolean {
    let slashCount = 0;
    for (let cursor = index - 1; cursor >= 0 && text[cursor] === '\\'; cursor--) slashCount++;
    return slashCount % 2 === 1;
  }
}
