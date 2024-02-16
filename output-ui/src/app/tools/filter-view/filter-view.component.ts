import { Component, Inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Publication } from '../../../../../output-interfaces/Publication';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { SearchFilter } from '../../../../../output-interfaces/Config';

@Component({
  selector: 'app-filter-view',
  templateUrl: './filter-view.component.html',
  styleUrls: ['./filter-view.component.css']
})
export class FilterViewComponent implements OnInit {

  form: FormGroup;

  joinOps: { op: string, label: string, showFirst?: boolean }[] = [
    { op: 'AND', label: 'Und' },
    { op: 'OR', label: 'Oder' },
    { op: 'NOT', label: '(Und) Nicht', showFirst:true }
  ]
  compareOps: { op: string, label: string, type?:string }[] = [
    { op: 'INCLUDES', label: 'enthält' },
    { op: 'EQUALS', label: 'ist genau' },
    { op: 'STARTS_WITH', label: 'beginnt mit' },
    { op: 'GREATER_THAN', label: 'größer als', type: 'number' },
    { op: 'SMALLER_THAN', label: 'kleiner als', type: 'number' },
  ]

  keys: { key: string, label: string, type?:string }[] = [
    { key: 'id', label: 'ID', type: 'number' },
    { key: 'title', label: 'Titel' },
    { key: 'doi', label: 'DOI' },
    { key: 'authors', label: 'Autoren' },
    { key: 'greater_entity', label: 'Größere Einheit' },
    { key: 'oa_category', label: 'OA-Kategorie' },
    { key: 'dataSource', label: 'Datenquelle' },
    { key: 'language', label: 'Sprache' },
    { key: 'secound_pub', label: 'Zweitveröffentlichung' },
    { key: 'add_info', label: 'Zusatzinformationen' },
    { key: 'locked', label: 'Gesperrt' },
    { key: 'status', label: 'Status' },
    { key: 'pub_type', label: 'Publikationstyp' },
    { key: 'publisher', label: 'Verlag' },
    { key: 'contract', label: 'Vertrag' },
  ]

  constructor(private formBuilder: FormBuilder, public dialogRef: MatDialogRef<FilterViewComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any, private publicationService: PublicationService) { }

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      filters: this.formBuilder.array([])
    })
    this.addRow(true);
  }

  getFilters() {
    return this.form.controls['filters'] as FormArray;
  }
  getFiltersControls() {
    return (this.form.controls['filters'] as FormArray).controls as unknown as FormGroup[];
  }

  addRow(first:boolean) {
    let filterForm: FormGroup = first? this.formBuilder.group({
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
    if (this.form.invalid) return;
    this.publicationService.filter(this.getFilter()).subscribe({
      next: data => {
        this.dialogRef.close(data)
      }
    })

  }

  reset(): void {
    this.dialogRef.close(null)
  }

  getFilter(): SearchFilter {
    let res:SearchFilter = {expressions: []}

    

    return res;
  }

  getFilterFunction(): ((p: Publication) => boolean) {
    let res = (p: Publication) => true;

    for (let filter of this.getFiltersControls()) {
      let part: (p: Publication) => boolean;
      switch (filter.get('compare_operator').value) {
        case 'INCLUDES':
          part = this.getCompareFunctionIncludes(filter.get('field').value, filter.get('value').value.trim().toLowerCase());
          break;
        case 'EQUALS':
          part = this.getCompareFunctionEquals(filter.get('field').value, filter.get('value').value.trim().toLowerCase());
          break;
        case 'STARTS_WITH':
          part = this.getCompareFunctionStartsWith(filter.get('field').value, filter.get('value').value.trim().toLowerCase());
          break;
        case 'GREATER_THAN':
          part = this.getCompareFunctionGreaterThan(filter.get('field').value, Number.parseFloat(filter.get('value').value.trim().toLowerCase()));
          break;
        case 'SMALLER_THAN':
          part = this.getCompareFunctionSmallerThan(filter.get('field').value, Number.parseFloat(filter.get('value').value.trim().toLowerCase()));
          break;
      }
      let tmp;
      switch (filter.get('join_operator').value) {
        case 'OR':
          tmp = res.bind({});
          res = ((p: Publication) => { return tmp(p) || part(p) });
          break;
        case 'NOT':
          tmp = res.bind({});
          res = ((p: Publication) => { return tmp(p) && !part(p) });
          break;
        case 'AND':
        default:
          tmp = res.bind({});
          res = ((p: Publication) => { return tmp(p) && part(p) });
          break;
      }
    }
    return res;
  }

  getCompareFunctionIncludes(field: string, value: string): ((p: Publication) => boolean) {
    let res: ((p: Publication) => boolean);
    switch (field) {
      case 'greater_entity':
      case 'oa_category':
      case 'pub_type':
      case 'publisher':
      case 'contract':
        res = (p) => p[field] ? p[field].label.trim().toLowerCase().includes(value) : false;
        break;
      default:
        res = (p) => (p[field] + '').trim().toLowerCase().includes(value);
        break;
    }
    return res;
  }

  getCompareFunctionEquals(field: string, value: string): ((p: Publication) => boolean) {
    let res: ((p: Publication) => boolean);
    switch (field) {
      case 'greater_entity':
      case 'oa_category':
      case 'pub_type':
      case 'publisher':
      case 'contract':
        res = (p) => p[field] ? p[field].label.trim().toLowerCase() === value : false;
        break;
      default:
        res = (p) => ((p[field] + '').trim().toLowerCase()) === (value);
        break;
    }
    return res;
  }

  getCompareFunctionStartsWith(field: string, value: string): ((p: Publication) => boolean) {
    let res: ((p: Publication) => boolean);
    switch (field) {
      case 'greater_entity':
      case 'oa_category':
      case 'pub_type':
      case 'publisher':
      case 'contract':
        res = (p) => p[field] ? p[field].label.trim().toLowerCase().startsWith(value) : false;
        break;
      default:
        res = (p) => (p[field]+ '').trim().toLowerCase().startsWith(value);
        break;
    }
    return res;
  }

  getCompareFunctionGreaterThan(field: string, value: number): ((p: Publication) => boolean) {
    let res: ((p: Publication) => boolean);
    switch (field) {
      default:
        res = (p) => (p[field]) > (value);
        break;
    }
    return res;
  }

  getCompareFunctionSmallerThan(field: string, value: number): ((p: Publication) => boolean) {
    let res: ((p: Publication) => boolean);
    switch (field) {
      default:
        res = (p) => (p[field]) < (value);
        break;
    }
    return res;
  }

  display(idx:number, op:{ op: string, label: string, type?:string }): boolean {
    if (!this.getFiltersControls()[idx].get('field').value) return true;
    let key = this.keys.find(e => e.key === this.getFiltersControls()[idx].get('field').value);
    if (op.type && key.type !== op.type) return false;
    return true;
  }

}
