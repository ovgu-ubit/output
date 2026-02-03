import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ImportWorkflow } from '../../../../../../../output-interfaces/Workflow';
import { SharedModule } from 'src/app/shared/shared.module';
import { ImportFormFacade } from '../import-form-facade.service';

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
    this.facade.import$.forEach(e => {
      this.entity = e;
      this.form.patchValue(e)
    })
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
