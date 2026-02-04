import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ImportWorkflow } from '../../../../../../../output-interfaces/Workflow';
import { SharedModule } from 'src/app/shared/shared.module';
import { ImportFormFacade } from '../import-form-facade.service';
import { DatePipe } from '@angular/common';

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
  entity: ImportWorkflow;

  constructor(private formBuilder: FormBuilder, private facade: ImportFormFacade) { }

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      id: [{value:'', disabled:true}],
      label: [''],
      version: [''],
      created_at: [{value: new Date(), disabled:true}],
      modified_at: [{value: new Date(), disabled:true}],
      published_at: [{value: new Date(), disabled:true}],
      deleted_at: [{value: new Date(), disabled:true}],
      description: [''],
    })
    this.facade.import$.forEach(e => {
      this.entity = e;
      this.form.patchValue(e)
    })
  }

  action() {
    let res = {
      id: this.form.get('id').value,
      label: this.form.get('label').value,
      version: this.form.get('version').value,
      description: this.form.get('description').value,
    }
    console.log(res)
  }

  reset() {
    this.form.patchValue(this.entity)
  }
}
