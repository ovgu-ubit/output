import { Component, Inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'app-alias-form',
    templateUrl: './alias-form.component.html',
    styleUrls: ['./alias-form.component.css'],
    standalone: false
})
export class AliasFormComponent implements OnInit {
  constructor(public dialogRef: MatDialogRef<AliasFormComponent>, @Inject(MAT_DIALOG_DATA) public data: {aliases: string[]},
  private formBuilder:FormBuilder) { }

  public form:FormGroup;

  ngOnInit(): void {
    let controls:FormGroup[] = [];
    if (!this.data.aliases || this.data.aliases.length === 0) this.dialogRef.close([])
    for (let dat of this.data.aliases) {
      let control:FormGroup = this.formBuilder.group({
        alias: [dat]
      });
      controls.push(control)
    }
    this.form = this.formBuilder.group({
      array: this.formBuilder.array(controls)
    })
    

  }

  get array():FormArray {
    return this.form.controls["array"] as FormArray;
  }

  getControls():FormGroup[] {
    return this.array.controls as FormGroup[];
  }

  action() {
    let res = [];
    for (let c of this.getControls()) {
      if (c.value.alias) res.push(c.value.alias.toLowerCase())
    }
    this.dialogRef.close(res)
  }

  abort() {
    this.dialogRef.close(null)
  }


}
