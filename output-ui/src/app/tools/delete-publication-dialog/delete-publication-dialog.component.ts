import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Publication } from '../../../../../output-api/src/entity/Publication';

@Component({
  selector: 'app-delete-publication-dialog',
  templateUrl: './delete-publication-dialog.component.html',
  styleUrls: ['./delete-publication-dialog.component.css']
})
export class DeletePublicationDialogComponent implements OnInit {
  soft: boolean;

  softdeleted_only = true;

  constructor(public dialogRef: MatDialogRef<DeletePublicationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {pubs:Publication[],soft:boolean}) {
  }

  ngOnInit() {
  }

  onConfirm(): void {
    // Close the dialog, return true
    this.dialogRef.close({ soft: this.soft});
  }

  onDismiss(): void {
    // Close the dialog, return false
    this.dialogRef.close(null);
  }
}