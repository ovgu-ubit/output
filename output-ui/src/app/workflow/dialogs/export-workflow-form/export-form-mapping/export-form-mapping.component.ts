import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { filter, takeUntil } from 'rxjs';
import { SharedModule } from 'src/app/shared/shared.module';
import { ExportWorkflow } from '../../../../../../../output-interfaces/Workflow';
import { ExportFormFacade } from '../export-form-facade.service';

@Component({
  selector: 'app-export-form-mapping',
  imports: [SharedModule],
  templateUrl: './export-form-mapping.component.html',
  styleUrl: './export-form-mapping.component.css',
})
export class ExportFormMappingComponent implements OnInit {
  form: FormGroup;
  entity: ExportWorkflow;

  constructor(private facade: ExportFormFacade, private formBuilder: FormBuilder) { }

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      mapping: [''],
    });
    this.facade.export$.pipe(filter((e): e is ExportWorkflow => e != null), takeUntil(this.facade.destroy$)).subscribe(workflow => {
      this.entity = workflow;
      this.form.patchValue({ mapping: workflow.mapping ?? '' }, { emitEvent: false });
      if (this.entity.published_at || this.entity.deleted_at) this.form.disable();
    });
  }

  action() {
    this.facade.patch({
      mapping: this.form.controls.mapping.value
    });
  }

  reset() {
    this.form.patchValue({ mapping: this.entity.mapping ?? '' }, { emitEvent: false });
  }
}
