import { Component, Inject, OnInit,ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Publication } from '../../../../../output-interfaces/Publication';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { CompareOperation, JoinOperation, SearchFilter, SearchFilterExpression } from '../../../../../output-interfaces/Config';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatChipListbox } from '@angular/material/chips';

@Component({
  selector: 'app-filter-view',
  templateUrl: './filter-view.component.html',
  styleUrls: ['./filter-view.component.css']
})
export class FilterViewComponent implements OnInit {

  form: FormGroup;
  filters: {path:string, label:string}[];
  selected=[];
  
  @ViewChild(MatChipListbox) chips: MatChipListbox;

  joinOps: { op: JoinOperation, label: string, showFirst?: boolean }[] = [
    { op: JoinOperation.AND, label: 'Und' },
    { op: JoinOperation.OR, label: 'Oder' },
    { op: JoinOperation.AND_NOT, label: '(Und) Nicht', showFirst: true }
  ]
  compareOps: { op: CompareOperation, label: string, type?: string|string[] }[] = [
    { op: CompareOperation.INCLUDES, label: 'enthält' },
    { op: CompareOperation.EQUALS, label: 'ist genau', type: ['number','date']  },
    { op: CompareOperation.STARTS_WITH, label: 'beginnt mit' },
    { op: CompareOperation.GREATER_THAN, label: 'größer als', type: ['number','date'] },
    { op: CompareOperation.SMALLER_THAN, label: 'kleiner als', type: ['number','date'] },
  ]

  keys: { key: string, label: string, type?: string }[] = [
    { key: 'id', label: 'ID', type: 'number' },
    { key: 'title', label: 'Titel' },
    { key: 'doi', label: 'DOI' },
    { key: 'authors', label: 'Autoren' },
    { key: 'pub_date', label: 'Publikationsdatum', type:'date' },
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

  constructor(private formBuilder: FormBuilder, public dialogRef: MatDialogRef<FilterViewComponent>, private publicationService: PublicationService,
    @Inject(MAT_DIALOG_DATA) public data: any) { }

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      filters: this.formBuilder.array([])
    })
    this.addRow(true);
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

    this.dialogRef.close({filter: this.getFilter(), paths: chips})

  }

  reset(): void {
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
      let expression:SearchFilterExpression = {
        op: filter.get('join_operator').value? filter.get('join_operator').value : JoinOperation.AND,
        key: filter.get('field').value,
        comp: filter.get('compare_operator').value,
        value: filter.get('value').value
      }
      res.expressions.push(expression)
    }

    return res;
  }

  display(idx:number, op:{ op: CompareOperation, label: string, type?:string|string[] }): boolean {
    if (!this.getFiltersControls()[idx].get('field').value) return true;
    let key = this.keys.find(e => e.key === this.getFiltersControls()[idx].get('field').value);
    if (!Array.isArray(op.type) && key.type !== op.type) return false;
    else if (Array.isArray(op.type) && !op.type.find(e => e!==key.type)) return false;
    return true;
  }

  date(idx:number) {
    if (!this.getFiltersControls()[idx].get('field').value) return false;
    let key = this.keys.find(e => e.key === this.getFiltersControls()[idx].get('field').value);
    return (key.type == 'date' || key.type?.includes('date'))
  }
}
