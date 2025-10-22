import { Component,Inject,OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-log-dialog',
  templateUrl: './log-dialog.component.html',
  styleUrls: ['./log-dialog.component.css']
})
export class LogDialogComponent implements OnInit {

  text = [];
  showErr = false;

  constructor(public dialogRef: MatDialogRef<LogDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) {}

  ngOnInit(): void {
    this.text = this.data.data.split('\n');
  }

  downloadRep() {
    /*let blob = new Blob([this.data.data], { type: 'text/plain' });
    let url= window.URL.createObjectURL(blob);
    window.open(url);*/
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([this.data.data], { type: 'text/plain' }));
    a.download = this.data.label;
    // start download
    a.click();
  }
}
