import { Component, OnInit } from '@angular/core';
import { SharedModule } from 'src/app/shared/shared.module';
import { ImportWorkflow, ImportWorkflowTestResult } from '../../../../../../../output-interfaces/Workflow';
import { ImportFormFacade } from '../import-form-facade.service';
import { WorkflowService } from 'src/app/workflow/workflow.service';
import { filter, finalize, takeUntil } from 'rxjs';

@Component({
  selector: 'app-import-form-test',
  imports: [SharedModule],
  templateUrl: './import-form-test.component.html',
  styleUrl: './import-form-test.component.css',
})
export class ImportFormTestComponent implements OnInit {
  workflowId: number | null = null;
  isRunning = false;
  result: ImportWorkflowTestResult | null = null;
  errorMessage: string | null = null;

  constructor(
    private facade: ImportFormFacade,
    private workflowService: WorkflowService,
  ) { }

  ngOnInit(): void {
    this.facade.import$.pipe(filter((e): e is ImportWorkflow => e != null), takeUntil(this.facade.destroy$)).subscribe((workflow) => {
      this.workflowId = workflow?.id ?? null;
    });
  }

  runTest(): void {
    if (!this.workflowId || this.isRunning) return;

    this.isRunning = true;
    this.result = null;
    this.errorMessage = null;

    this.workflowService
      .test(this.workflowId)
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
}