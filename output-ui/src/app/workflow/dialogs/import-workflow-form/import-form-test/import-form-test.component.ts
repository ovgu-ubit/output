import { Component, OnInit } from '@angular/core';
import { SharedModule } from 'src/app/shared/shared.module';
import { ImportWorkflow, ImportWorkflowTestResult, Strategy } from '../../../../../../../output-interfaces/Workflow';
import { ImportFormFacade } from '../import-form-facade.service';
import { WorkflowService } from 'src/app/workflow/workflow.service';
import { filter, finalize, takeUntil } from 'rxjs';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-import-form-test',
  imports: [SharedModule],
  templateUrl: './import-form-test.component.html',
  styleUrl: './import-form-test.component.css',
})
export class ImportFormTestComponent implements OnInit {
  workflow: ImportWorkflow = null;
  isRunning = false;
  result: ImportWorkflowTestResult | null = null;
  errorMessage: string | null = null;
  form: FormGroup;

  constructor(
    private facade: ImportFormFacade,
    private workflowService: WorkflowService,
    private formBuilder: FormBuilder
  ) { }

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      pos: ['']
    })
      this.facade.import$.pipe(filter((e): e is ImportWorkflow => e != null), takeUntil(this.facade.destroy$)).subscribe((workflow) => {
        this.workflow = workflow ?? null;
      });
  }

  runTest(): void {
    if (!this.workflow.id || this.isRunning) return;

    this.isRunning = true;
    this.result = null;
    this.errorMessage = null;
    const pos = this.form.controls.pos.value ?? 1;
    this.workflowService
      .test(this.workflow.id, pos)
      .pipe(finalize(() => (this.isRunning = false)))
      .subscribe({
        next: (res) => {
          this.result = res;
        },
        error: () => {
          this.errorMessage =
            'Der Testlauf konnte nicht gestartet werden. Bitte prüfen Sie die Workflow-Konfiguration.';
        },
      });
  }

  getErrorText(error) {
    return JSON.stringify(error)
  }

  get doiStrategy() {
    return this.workflow?.strategy_type === Strategy.URL_DOI
  }
}