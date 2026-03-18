import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { filter, takeUntil } from 'rxjs';
import { SharedModule } from 'src/app/shared/shared.module';
import { ExportWorkflow } from '../../../../../../../output-interfaces/Workflow';
import { ExportFormFacade } from '../export-form-facade.service';

@Component({
  selector: 'app-export-form-general',
  templateUrl: './export-form-general.component.html',
  styleUrl: './export-form-general.component.css',
  standalone: true,
  imports: [
    SharedModule
  ]
})
export class ExportFormGeneralComponent implements OnInit {
  public form: FormGroup;
  entity: ExportWorkflow;

  constructor(private formBuilder: FormBuilder, private facade: ExportFormFacade) { }

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      id: [{ value: '', disabled: true }],
      workflow_id: [{ value: '', disabled: true }],
      label: [''],
      version: [''],
      created_at: [{ value: new Date(), disabled: true }],
      modified_at: [{ value: new Date(), disabled: true }],
      published_at: [{ value: new Date(), disabled: true }],
      deleted_at: [{ value: new Date(), disabled: true }],
      description: [''],
    });
    this.facade.export$.pipe(filter((e): e is ExportWorkflow => e != null), takeUntil(this.facade.destroy$)).subscribe(e => {
      this.entity = e;
      this.form.patchValue(e);
      if (this.entity.published_at || this.entity.deleted_at) this.form.disable();
    });
  }

  action() {
    const res = {
      id: this.form.get('id')!.value,
      label: this.form.get('label')!.value,
      version: this.form.get('version')!.value,
      description: this.form.get('description')!.value,
    };
    this.facade.patch(res);
  }

  reset() {
    this.form.patchValue(this.entity);
  }
}
