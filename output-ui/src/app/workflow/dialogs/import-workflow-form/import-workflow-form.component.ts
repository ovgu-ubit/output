import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-import-workflow-form',
  templateUrl: './import-workflow-form.component.html',
  styleUrl: './import-workflow-form.component.css',
  standalone: false
})
export class ImportWorkflowFormComponent {

  constructor(public dialogRef: MatDialogRef<ImportWorkflowFormComponent>,
    @Inject(MAT_DIALOG_DATA) public dialogData: any) { }
}
