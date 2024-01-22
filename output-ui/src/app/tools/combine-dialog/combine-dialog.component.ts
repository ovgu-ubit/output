import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-combine-dialog',
  templateUrl: './combine-dialog.component.html',
  styleUrls: ['./combine-dialog.component.css']
})
export class CombineDialogComponent<T> implements OnInit {
  constructor(public dialogRef: MatDialogRef<CombineDialogComponent<T>>, @Inject(MAT_DIALOG_DATA) public data: any) { }

  ents:T[];

  att_list:string[] = []

  ngOnInit(): void {
    this.ents = this.data['ents'];
    for (let attr in this.ents[0]) {
      this.att_list.push(attr);
    }
  }

  action(pos:number) {
    let res = this.ents[pos];
    this.dialogRef.close(res);
  }

  abort() {
    this.dialogRef.close(null);
  }

  getStyle(att:string) {
    let style = "background:red;";
    let value = "";
    for (let ent of this.ents) {
      if (!value) value = ent[att];
      else if (ent[att] != value) return style;
    }
    return "";
  }
}
