import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Publication } from '../../../../../output-interfaces/Publication';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { CompareOperation, JoinOperation, SearchFilter, SearchFilterExpression } from '../../../../../output-interfaces/Config';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatChipListbox } from '@angular/material/chips';
import { ConfigService } from 'src/app/services/config.service';

@Component({
  selector: 'app-filter-view',
  templateUrl: './filter-view.component.html',
  styleUrls: ['./filter-view.component.css']
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
    { op: CompareOperation.EQUALS, label: 'ist genau', type: ['string', 'number', 'date', 'boolean'] },
    { op: CompareOperation.STARTS_WITH, label: 'beginnt mit', type: ['string'] },
    { op: CompareOperation.GREATER_THAN, label: 'größer als', type: ['number', 'date'] },
    { op: CompareOperation.SMALLER_THAN, label: 'kleiner als', type: ['number', 'date'] },
  ]

  keys: { key: string, label: string, type?: string }[] = [
    { key: 'id', label: 'ID', type: 'number' },
    { key: 'title', label: 'Titel' },
    { key: 'doi', label: 'DOI' },
    { key: 'other_ids', label: 'Weitere Identifikatoren' },
    { key: 'authors', label: 'Autor*innen' },
    { key: 'inst_authors', label: 'Personen der Institution' },
    { key: 'author_id', label: 'ID einer Person der Institution' },
    { key: 'author_id_corr', label: 'ID einer Person der Institution (corr.)' },
    { key: 'institute', label: 'Institute' },
    { key: 'pub_date', label: 'Publikationsdatum', type: 'date' },
    { key: 'pub_date_accepted', label: 'Datum der Akzeptanz', type: 'date' },
    { key: 'greater_entity', label: 'Größere Einheit' },
    { key: 'greater_entity_id', label: 'ID einer größeren Einheit' },
    { key: 'oa_category', label: 'OA-Kategorie' },
    { key: 'oa_category_id', label: 'ID einer OA-Kategorie' },
    { key: 'dataSource', label: 'Datenquelle' },
    { key: 'language', label: 'Sprache' },
    { key: 'secound_pub', label: 'Zweitveröffentlichung' },
    { key: 'add_info', label: 'Weitere Informationen' },
    { key: 'locked', label: 'Gesperrt', type: 'boolean' },
    { key: 'status', label: 'Status', type: 'number' },
    { key: 'pub_type', label: 'Publikationstyp' },
    { key: 'pub_type_id', label: 'ID eines Publikationstyps' },
    { key: 'publisher', label: 'Verlag' },
    { key: 'publisher_id', label: 'ID eines Verlags' },
    { key: 'contract', label: 'Vertrag' },
    { key: 'contract_id', label: 'ID eines Vertrags' },
    { key: 'funder', label: 'Förderer' },
    { key: 'funder_id', label: 'ID eines Förderer' },
    { key: 'cost_center', label: 'Kostenstelle'  },
    { key: 'cost_center_id', label: 'ID einer Kostenstelle', type: 'number'  },
    { key: 'edit_date', label: 'Letzte Bearbeitung', type: 'date' },
    { key: 'import_date', label: 'Importdatum', type: 'date' },
  ]

  constructor(private formBuilder: FormBuilder, public dialogRef: MatDialogRef<FilterViewComponent>, private publicationService: PublicationService, private configService:ConfigService,
    @Inject(MAT_DIALOG_DATA) public data: any) { }

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      filters: this.formBuilder.array([])
    })
    this.addRow(true);
    this.configService.getOptionalFields().subscribe({
      next: data => {
        if (data['editors']) this.keys.push({ key: 'editors', label: 'Herausgeber*innen' })
        if (data['abstract']) this.keys.push({ key: 'abstract', label: 'Abstract' })
        if (data['citation']) {
          this.keys.push({ key: 'volume', label: 'Volume', type: 'number' })
          this.keys.push({ key: 'issue', label: 'Issue', type: 'number' })
          this.keys.push({ key: 'first_page', label: 'Erste Seite', type: 'number' })
          this.keys.push({ key: 'last_page', label: 'Letzte Seite', type: 'number' })
        }
        if (data['page_count']) this.keys.push({ key: 'page_count', label: 'Seitenzahl', type: 'number' })
        if (data['peer_reviewed']) this.keys.push({ key: 'peer_reviewed', label: 'Peer-Reviewed', type: 'boolean' })
        if (data['pub_date_print']) this.keys.push({ key: 'pub_date_print', label: 'Publikationsdatum (print)', type: 'date' })
        if (data['pub_date_submitted']) this.keys.push({ key: 'pub_date_submitted', label: 'Datum der Einreichung', type: 'date' })
      }
    })

    this.publicationService.getFilters().subscribe({
      next: data => {
        this.filters = data;
        if (this.data.viewConfig?.filter.paths && this.data.viewConfig?.filter.paths.length > 0) {
          for (let e of this.data.viewConfig?.filter.paths) {
            let idx = this.filters.findIndex(f => f.path === e);
            if (idx >= 0) {
              this.selected[this.filters[idx].path] = true;
            }
          }
        }
      }
    })
    if (this.data.viewConfig?.filter && this.data.viewConfig?.filter.filter.expressions.length > 0) {
      let i = 0;
      for (let e of this.data.viewConfig?.filter.filter.expressions) {
        if (i !== 0) this.addRow(false);
        this.getFiltersControls()[i].get('join_operator').setValue(e.op)
        this.getFiltersControls()[i].get('field').setValue(e.key)
        this.getFiltersControls()[i].get('compare_operator').setValue(e.comp)
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
    if (!Array.isArray(this.chips.selected)) chips = [this.chips.selected.value]
    else chips = this.chips.selected.map(e => e.value);

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
    if (Array.isArray(this.chips.selected)) this.chips.selected.forEach(i => {
      i.deselect();
    });
    else this.chips.selected.select();
  }

  getFilter(): SearchFilter {
    let res: SearchFilter = { expressions: [] }

    for (let filter of this.getFiltersControls()) {
      if (!filter.get('field').value || !filter.get('value').value) continue;
      let expression: SearchFilterExpression = {
        op: filter.get('join_operator').value && filter.get('join_operator').value !== 'null' ? filter.get('join_operator').value : JoinOperation.AND,
        key: filter.get('field').value,
        comp: filter.get('compare_operator').value,
        value: this.getValue(filter.get('field').value, filter.get('value').value)
      }
      res.expressions.push(expression)
    }

    return res;
  }

  getValue(key, value): any {
    if (key === 'locked') {
      value = value + '';
      if (value.toLowerCase().includes('true') || value.toLowerCase().includes('wahr') || value.toLowerCase().includes('1') || value.toLowerCase().includes('ja')) return true;
      else return false;
    }
    return value;
  }

  display(idx: number, op: { op: CompareOperation, label: string, type?: string[] }): boolean {
    if (!this.getFiltersControls()[idx].get('field').value) return true;
    let key = this.keys.find(e => e.key === this.getFiltersControls()[idx].get('field').value);
    let type = key.type? key.type : 'string';
    if (op.type.find(e => e === type)) return true;
    else return false;
  }

  date(idx: number) {
    if (!this.getFiltersControls()[idx].get('field').value) return false;
    let key = this.keys.find(e => e.key === this.getFiltersControls()[idx].get('field').value);
    return (key.type == 'date' || key.type?.includes('date'))
  }
}
