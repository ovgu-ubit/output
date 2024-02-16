import { Component, Inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Publication } from '../../../../../output-interfaces/Publication';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { CompareOperation, JoinOperation, SearchFilter, SearchFilterExpression } from '../../../../../output-interfaces/Config';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-filter-view',
  templateUrl: './filter-view.component.html',
  styleUrls: ['./filter-view.component.css']
})
export class FilterViewComponent implements OnInit {

  form: FormGroup;

  joinOps: { op: JoinOperation, label: string, showFirst?: boolean }[] = [
    { op: JoinOperation.AND, label: 'Und' },
    { op: JoinOperation.OR, label: 'Oder' },
    { op: JoinOperation.AND_NOT, label: '(Und) Nicht', showFirst: true }
  ]
  compareOps: { op: CompareOperation, label: string, type?: string }[] = [
    { op: CompareOperation.INCLUDES, label: 'enthält' },
    { op: CompareOperation.EQUALS, label: 'ist genau' },
    { op: CompareOperation.STARTS_WITH, label: 'beginnt mit' },
    { op: CompareOperation.GREATER_THAN, label: 'größer als', type: 'number' },
    { op: CompareOperation.SMALLER_THAN, label: 'kleiner als', type: 'number' },
  ]

  keys: { key: string, label: string, type?: string }[] = [
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

  constructor(private formBuilder: FormBuilder, public dialogRef: MatDialogRef<FilterViewComponent>, private publicationService: PublicationService,
    private _snackBar: MatSnackBar) { }

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
    if (this.form.invalid) return;
    this.publicationService.filter(this.getFilter()).subscribe({
      next: data => {
        this.dialogRef.close(data)
      },
      error: err => {
        this._snackBar.open(`Filter kann nicht angewandt werden, bitte anpassen`, 'Puh...', {
          duration: 5000,
          panelClass: [`danger-snackbar`],
          verticalPosition: 'top'
        })
      }
    })
  }

  reset(): void {
    this.dialogRef.close(null)
  }

  getFilter(): SearchFilter {
    let res: SearchFilter = { expressions: [] }

    for (let filter of this.getFiltersControls()) {
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

  display(idx:number, op:{ op: CompareOperation, label: string, type?:string }): boolean {
    if (!this.getFiltersControls()[idx].get('field').value) return true;
    let key = this.keys.find(e => e.key === this.getFiltersControls()[idx].get('field').value);
    if (op.type && key.type !== op.type) return false;
    return true;
  }
}
