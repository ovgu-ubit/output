import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ImportWorkflow } from '../../../../../../../output-interfaces/Workflow';
import { WorkflowService } from 'src/app/workflow/workflow.service';
import { RouterModule } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';

@Component({
  selector: 'app-import-form-general',
  templateUrl: './import-form-general.component.html',
  styleUrl: './import-form-general.component.css',
  standalone: true,
  imports: [
    SharedModule
  ]
})
export class ImportFormGeneralComponent implements OnInit {

  public form: FormGroup;

  @Input() entity: ImportWorkflow;

  constructor(private formBuilder: FormBuilder, private workflowService: WorkflowService) { }

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
    this.form.patchValue(this.entity);
  }

  action() {
    
  }

  enter(event) {
    if (event.keyCode == 13 && event.srcElement.localName !== 'textarea') return false;
    return true;
  }

  escape(event) {
    if (event.key === 'Escape') {
      //this.abort();
      return false;
    }
    return true;
  }
}
