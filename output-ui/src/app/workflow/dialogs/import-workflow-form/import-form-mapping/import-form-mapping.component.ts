import { Component, OnInit } from '@angular/core';
import { ImportWorkflow } from '../../../../../../../output-interfaces/Workflow';
import { SharedModule } from 'src/app/shared/shared.module';
import { ImportFormFacade } from '../import-form-facade.service';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-import-form-mapping',
  imports: [SharedModule],
  templateUrl: './import-form-mapping.component.html',
  styleUrl: './import-form-mapping.component.css',
})
export class ImportFormMappingComponent implements OnInit {
  readonly workflow$ = this.facade.import$;
  form: FormGroup;

  constructor(private facade: ImportFormFacade, private formBuilder:FormBuilder) { }

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      mapping: [''],
    });
    this.facade.import$.subscribe(workflow => {
      if (!workflow) return;
      this.form.patchValue({ mapping: workflow.mapping ?? '' }, { emitEvent: false });
    });
  }

}
