import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AliasFormComponent } from '../alias-form/alias-form.component';
import { Funder } from '../../../../../output-api/src/entity/Funder';

@Component({
  selector: 'app-combine-dialog',
  templateUrl: './combine-dialog.component.html',
  styleUrls: ['./combine-dialog.component.css']
})
export class CombineDialogComponent<T> implements OnInit {
  constructor(public dialogRef: MatDialogRef<CombineDialogComponent<T>>, @Inject(MAT_DIALOG_DATA) public data: any,
    private dialog: MatDialog) { }

  ents: T[];

  att_list: string[] = []

  ngOnInit(): void {
    this.ents = this.data['ents'];
    for (let attr in this.ents[0]) {
      this.att_list.push(attr);
    }
  }

  action(pos: number) {
    let res = this.ents[pos];
    if (this.data.aliases) {
      if (!this.data.author) {
        //open alias dialog
        let aliases = [];
        for (let i = 0; i < this.ents.length; i++) {
          if (i === pos) continue;
          aliases.push(this.ents[i]['label']?.toLowerCase())
        }

        let dialogRef = this.dialog.open(AliasFormComponent, {
          width: '400px',
          maxHeight: '800px',
          data: {
            aliases
          },
          disableClose: true
        });
        dialogRef.afterClosed().subscribe(result => {
          if (result) {
            res = { ...res, aliases: result }
            this.dialogRef.close(res);
          }
          else this.dialogRef.close(res);
        });
      } else {//author
        //open alias dialog first_name
        let aliases = [];
        for (let i = 0; i < this.ents.length; i++) {
          if (i === pos || res['first_name'].toLowerCase().includes(this.ents[i]['first_name']?.toLowerCase())) continue;
          aliases.push(this.ents[i]['first_name']?.toLowerCase())
        }

        let dialogRef = this.dialog.open(AliasFormComponent, {
          width: '400px',
          maxHeight: '800px',
          data: {
            aliases
          },
          disableClose: true
        });
        dialogRef.afterClosed().subscribe(result => {
          if (result && result.length > 0) {
            res = { ...res, aliases_first_name: result }
          }
          //open alias dialog last_name
          let aliases = [];
          for (let i = 0; i < this.ents.length; i++) {
            if (i === pos || res['last_name'].toLowerCase().includes(this.ents[i]['last_name']?.toLowerCase())) continue;
            aliases.push(this.ents[i]['last_name']?.toLowerCase())
          }

          let dialogRef = this.dialog.open(AliasFormComponent, {
            width: '400px',
            maxHeight: '800px',
            data: {
              aliases
            },
            disableClose: true
          });
          dialogRef.afterClosed().subscribe(result => {
            if (result) {
              res = { ...res, aliases_last_name: result }
            }
            this.dialogRef.close(res);
          });
        }
      );
    }
  } else {
  this.dialogRef.close(res);
}
  }

abort() {
  this.dialogRef.close(null);
}

getStyle(att: string) {
  let style = "background:red;";
  let value = "";
  for (let ent of this.ents) {
    if (!value) value = ent[att];
    else if (ent[att] != value) return style;
  }
  return "";
}
}
