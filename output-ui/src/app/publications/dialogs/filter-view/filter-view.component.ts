import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { MatChipListbox } from '@angular/material/chips';
import {  CompareOperation, JoinOperation, SearchFilter, SearchFilterExpression  } from '@output/interfaces';
import { ConfigService } from 'src/app/administration/services/config.service';
import { map, merge } from 'rxjs';
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
  compareOps: { op: CompareOperation, label: string, type: string[] }[] = [
    { op: CompareOperation.INCLUDES, label: 'enthält', type: ['string'] },
    { op: CompareOperation.EQUALS, label: 'ist genau', type: ['string', 'number', 'date', 'boolean','id'] },
    { op: CompareOperation.STARTS_WITH, label: 'beginnt mit', type: ['string'] },
    { op: CompareOperation.GREATER_THAN, label: 'größer als', type: ['number', 'date'] },
    { op: CompareOperation.SMALLER_THAN, label: 'kleiner als', type: ['number', 'date'] },
    { op: CompareOperation.IN , label: 'ist einer von (komma-getrennt)', type: ['string','id','number'] },
  ]

  keys: { key: string, label: string, type?: string }[] = [
    { key: 'id', label: 'ID', type: 'id' },
    { key: 'title', label: 'Titel' },
    { key: 'doi', label: 'DOI' },
    { key: 'other_ids', label: 'Weitere Identifikatoren' },
    { key: 'authors', label: 'Autor*innen-Angabe' },
    { key: 'inst_authors', label: 'Personen der Institution' },
    { key: 'author_id', label: 'ID einer Person der Institution', type: 'id' },
    { key: 'author_id_corr', label: 'ID einer Person der Institution (corr.)', type: 'id' },
    { key: 'institute', label: 'Institute' },
    { key: 'institute_id', label: 'ID eines Instituts', type: 'id' },
    { key: 'institute_id_corr', label: 'ID eines Instituts (corr.)', type: 'id' },
    { key: 'pub_date', label: 'Publikationsdatum', type: 'date' },
    { key: 'pub_date_accepted', label: 'Datum der Akzeptanz', type: 'date' },
    { key: 'greater_entity', label: 'Größere Einheit' },
    { key: 'greater_entity_id', label: 'ID einer größeren Einheit', type: 'id' },
    { key: 'oa_category', label: 'OA-Kategorie' },
    { key: 'oa_category_id', label: 'ID einer OA-Kategorie', type: 'id' },
    { key: 'dataSource', label: 'Datenquelle' },
    { key: 'language', label: 'Sprache' },
    { key: 'secound_pub', label: 'Zweitveröffentlichung' },
    { key: 'add_info', label: 'Weitere Informationen' },
    { key: 'locked', label: 'Gesperrt', type: 'boolean' },
    { key: 'status', label: 'Status', type: 'number' },
    { key: 'pub_type', label: 'Publikationstyp' },
    { key: 'pub_type_id', label: 'ID eines Publikationstyps', type: 'id' },
    { key: 'publisher', label: 'Verlag' },
    { key: 'publisher_id', label: 'ID eines Verlags', type: 'id' },
    { key: 'contract', label: 'Vertrag' },
    { key: 'contract_id', label: 'ID eines Vertrags', type: 'id' },
    { key: 'funder', label: 'Förderer' },
    { key: 'funder_id', label: 'ID eines Förderer', type: 'id' },
    { key: 'cost_center', label: 'Kostenstelle' },
    { key: 'cost_center_id', label: 'ID einer Kostenstelle', type: 'id' },
    { key: 'cost_type', label: 'Kostenart' },
    { key: 'cost_type_id', label: 'ID einer Kostenart', type: 'id' },
    { key: 'invoice_year', label: 'Rechnungsjahr', type: 'number' },
    { key: 'contract_year', label: 'Vertragsjahr', type: 'number' },
    { key: 'edit_date', label: 'Letzte Bearbeitung', type: 'date' },
    { key: 'import_date', label: 'Importdatum', type: 'date' },
  ]

  optional_fields: {
    abstract?: boolean,
    citation?: boolean,
    page_count?: boolean,
    pub_date_submitted?: boolean,
    pub_date_print?: boolean,
    peer_reviewed?: boolean
  } = {};

  constructor(private formBuilder: FormBuilder, public dialogRef: MatDialogRef<FilterViewComponent>, private publicationService: PublicationService, private configService: ConfigService,
    @Inject(MAT_DIALOG_DATA) public data: any) { }

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      filters: this.formBuilder.array([])
    })
    this.addRow(true);

    this.configService.get("optional_fields").pipe(map(data => {
      this.optional_fields = data.value;
    })).subscribe({
      next: data => {
        if (this.optional_fields['editors']) this.keys.push({ key: 'editors', label: 'Herausgeber*innen' })
        if (this.optional_fields['abstract']) this.keys.push({ key: 'abstract', label: 'Abstract' })
        if (this.optional_fields['citation']) {
          this.keys.push({ key: 'volume', label: 'Volume', type: 'number' })
          this.keys.push({ key: 'issue', label: 'Issue', type: 'number' })
          this.keys.push({ key: 'first_page', label: 'Erste Seite', type: 'number' })
          this.keys.push({ key: 'last_page', label: 'Letzte Seite', type: 'number' })
        }
        if (this.optional_fields['page_count']) this.keys.push({ key: 'page_count', label: 'Seitenzahl', type: 'number' })
        if (this.optional_fields['peer_reviewed']) this.keys.push({ key: 'peer_reviewed', label: 'Peer-Reviewed', type: 'boolean' })
        if (this.optional_fields['pub_date_print']) this.keys.push({ key: 'pub_date_print', label: 'Publikationsdatum (print)', type: 'date' })
        if (this.optional_fields['pub_date_submitted']) this.keys.push({ key: 'pub_date_submitted', label: 'Datum der Einreichung', type: 'date' })
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
        this.getFiltersControls()[i].get('join_operator').setValue(e.op)
        this.getFiltersControls()[i].get('field').setValue(e.key)
        this.getFiltersControls()[i].get('compare_operator').setValue(e.comp)
        this.normalizeCompareOperator(this.getFiltersControls()[i])
        this.getFiltersControls()[i].get('value').setValue(e.value)
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
      value: ['', Validators.required],
    })
      : this.formBuilder.group({
        join_operator: ['', Validators.required],
        field: ['', Validators.required],
        compare_operator: ['', Validators.required],
        value: ['', Validators.required],
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
      if (!filter.get('field').value || !filter.get('value').value) continue;
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

    let field = this.keys.find(e => e.key === key);
    if (field && field.type === 'boolean') {
      if (typeof value === 'boolean') return value;
      value = String(value).toLowerCase();
      if (value.includes('true') || value.includes('wahr') || value.includes('1') || value.includes('ja')) return true;
      else return false;
    }
    return value;
  }

  private getListValue(key: string, value: any): Array<string | number | boolean> {
    const fieldType = this.getFieldType(key);
    const values = Array.isArray(value) ? value : String(value ?? '').split(/[\n,]+/);

    return values
      .map(entry => this.parseListEntry(fieldType, typeof entry === 'string' ? entry.trim() : entry))
      .filter((entry): entry is string | number | boolean => entry !== null && entry !== '');
  }

  private parseListEntry(fieldType: string, value: any): string | number | boolean | null {
    if (fieldType === 'number' || fieldType === 'id') {
      if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return null;
      const numberValue = Number(value);
      return Number.isNaN(numberValue) ? null : numberValue;
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

  isBoolean(idx: number): boolean {
    if (!this.getFiltersControls()[idx].get('field').value) return false;
    let key = this.keys.find(e => e.key === this.getFiltersControls()[idx].get('field').value);
    return key && key.type === 'boolean';
  }

  display(idx: number, op: { op: CompareOperation, label: string, type?: string[] }): boolean {
    if (!this.getFiltersControls()[idx].get('field').value) return true;
    let type = this.getFieldType(this.getFiltersControls()[idx].get('field').value);
    if (op.type.find(e => e === type)) return true;
    else return false;
  }

  date(idx: number) {
    if (!this.getFiltersControls()[idx].get('field').value) return false;
    let key = this.keys.find(e => e.key === this.getFiltersControls()[idx].get('field').value);
    return key && (key.type == 'date' || key.type?.includes('date'))
  }

  private normalizeCompareOperator(filter: FormGroup): void {
    const field = filter.get('field').value;
    if (!field) return;

    const compareOperator = filter.get('compare_operator');
    const validOps = this.compareOps.filter(op => op.type.includes(this.getFieldType(field)));
    if (!validOps.find(op => op.op === compareOperator.value)) {
      compareOperator.setValue(validOps[0]?.op ?? CompareOperation.EQUALS);
    }
  }

  private getFieldType(key: string): string {
    return this.keys.find(e => e.key === key)?.type ?? 'string';
  }
}
