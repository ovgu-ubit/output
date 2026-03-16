import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { filter, switchMap, takeUntil } from 'rxjs';
import { ImportWorkflow, WorkflowReport, WorkflowReportItemLevel } from '../../../../../../../output-interfaces/Workflow';
import { PublicationChangeLogComponent } from 'src/app/publications/dialogs/publication-change-log/publication-change-log.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { WorkflowService } from 'src/app/workflow/workflow.service';
import { ImportFormFacade } from '../import-form-facade.service';

@Component({
  selector: 'app-import-form-log',
  imports: [SharedModule, PublicationChangeLogComponent],
  templateUrl: './import-form-log.component.html',
  styleUrl: './import-form-log.component.css',
})
export class ImportFormLogComponent implements OnInit {
  workflow: ImportWorkflow | null = null;
  report: WorkflowReport | null = null;
  hideInfoItems = false;
  messageFilter = '';
  collapseLogEntries = false;
  collapsePublicationChanges = false;

  readonly workflowReportItemLevel = WorkflowReportItemLevel;

  constructor(
    private route: ActivatedRoute,
    private workflowService: WorkflowService,
    private facade: ImportFormFacade
  ) { }

  ngOnInit(): void {
    this.facade.import$
      .pipe(filter((workflow): workflow is ImportWorkflow => workflow != null), takeUntil(this.facade.destroy$))
      .subscribe((workflow) => {
        this.workflow = workflow;
      });

    this.route.paramMap
      .pipe(
        filter((params) => params.has('reportId')),
        switchMap((params) => this.workflowService.getWorkflowReport(Number(params.get('reportId')))),
        takeUntil(this.facade.destroy$)
      )
      .subscribe((report) => {
        this.report = report;
      });
  }

  getLevelClass(level?: WorkflowReportItemLevel): string {
    switch (level) {
      case WorkflowReportItemLevel.ERROR:
        return 'log-error';
      case WorkflowReportItemLevel.WARNING:
        return 'log-warning';
      case WorkflowReportItemLevel.DEBUG:
        return 'log-debug';
      case WorkflowReportItemLevel.INFO:
      default:
        return 'log-info';
    }
  }

  get filteredItems() {
    if (!this.report?.items) return [];
    const needle = this.messageFilter.trim().toLowerCase();
    return this.report.items.filter((item) => {
      if (this.hideInfoItems && item.level === WorkflowReportItemLevel.INFO) return false;
      if (!needle) return true;
      return (item.message || '').toLowerCase().includes(needle);
    });
  }
}
