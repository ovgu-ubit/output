import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { EntityFormComponent } from 'src/app/services/entities/service.interface';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/shared/confirm-dialog/confirm-dialog.component';
import { ImportWorkflow } from '../../../../../../output-interfaces/Workflow';
import { WorkflowService } from '../../workflow.service';

@Component({
  selector: 'app-import-workflow-form',
  templateUrl: './import-workflow-form.component.html',
  styleUrl: './import-workflow-form.component.css',
  standalone: false
})
export class ImportWorkflowFormComponent implements OnInit, AfterViewInit, EntityFormComponent<ImportWorkflow> {

  constructor(public dialogRef: MatDialogRef<ImportWorkflowFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any, private workflowService: WorkflowService, private dialog: MatDialog,
    private formBuilder: FormBuilder) { }

  entity: ImportWorkflow;

  public form: FormGroup;
  disabled: boolean;
  name = 'Import-Workflow'

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      id: [''],
      label: [''],
      version: [''],
      created_at: [''],
      modified_at: [''],
      published_at: [''],
      deleted_at: [''],
      description: [''],
    })
    this.form.get('id').disable();
  }

  ngAfterViewInit(): void {
    if (this.data?.entity?.id) {
      this.workflowService.getOne(this.data.entity.id).subscribe({
        next: data => {
          this.entity = data;
          this.form.patchValue(data);
          if (this.entity.published_at) this.form.disable();
        }
      })
    } else if (this.data?.entity) {
      this.form.patchValue(this.data.entity);
    }
  }

  disable() {
    this.disabled = true;
    this.form.disable();
  }

  async action() {
    if (this.form.invalid) return;
    this.entity = { ...this.entity, ...this.form.getRawValue() }
    //doaj_since: this.form.get('doaj_since').value ? this.form.get('doaj_since').value.format() : undefined
    for (let field of Object.keys(this.entity)) if (this.entity[field] === '') this.entity[field] = null;
    if (!this.entity.id) this.entity.id = undefined;
    this.dialogRef.close({ ...this.entity, updated: true })
  }

  close() {
    this.dialogRef.close(null)
  }

  abort() {
    if (this.form.dirty) {
      let dialogData = new ConfirmDialogModel("Ungesicherte Änderungen", `Es gibt ungespeicherte Änderungen, möchten Sie diese zunächst speichern?`);

      let dialogRef = this.dialog.open(ConfirmDialogComponent, {
        maxWidth: "400px",
        data: dialogData
      });

      dialogRef.afterClosed().subscribe(dialogResult => {
        if (dialogResult) { //save
          this.action();
        } else if (this.entity?.id) this.close();
        else this.close()
      });
    } else this.close();
  }

  enter(event) {
    if (event.keyCode == 13 && event.srcElement.localName !== 'textarea') return false;
    return true;
  }

  escape(event) {
    if (event.key === 'Escape') {
      this.abort();
      return false;
    }
    return true;
  }
}
