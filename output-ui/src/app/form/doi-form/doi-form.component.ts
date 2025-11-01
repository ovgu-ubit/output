import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'app-doi-form',
    templateUrl: './doi-form.component.html',
    styleUrls: ['./doi-form.component.css'],
    standalone: false
})
export class DoiFormComponent implements OnInit {
  constructor(public dialogRef: MatDialogRef<DoiFormComponent>,
    private formBuilder: FormBuilder) { }

  public form: FormGroup;

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      doi: ['']
    })
  }

  action() {
    if (!this.form.get('doi')) return;
    this.dialogRef.close(this.form.getRawValue())
  }

  abort() {
    this.dialogRef.close(null)
  }

  manual() {
    this.dialogRef.close({doi:''})
  }
}

