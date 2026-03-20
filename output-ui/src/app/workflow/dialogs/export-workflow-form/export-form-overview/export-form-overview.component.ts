import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { filter, takeUntil } from 'rxjs';
import { SharedModule } from 'src/app/shared/shared.module';
import { ExportWorkflow, WorkflowReport } from '../../../../../../../output-interfaces/Workflow';
import { ExportFormFacade } from '../export-form-facade.service';

@Component({
  selector: 'app-export-form-overview',
  imports: [SharedModule],
  templateUrl: './export-form-overview.component.html',
  styleUrl: './export-form-overview.component.css',
})
export class ExportFormOverviewComponent implements OnInit {
  readonly reportBatchSize = 5;
  entity: ExportWorkflow | null = null;
  associatedReports: WorkflowReport[] = [];
  canLoadMoreReports = false;
  loadingReports = false;

  constructor(private facade: ExportFormFacade, private router: Router, private route: ActivatedRoute) { }

  ngOnInit() {
    this.facade.export$
      .pipe(filter((e): e is ExportWorkflow => e != null), takeUntil(this.facade.destroy$))
      .subscribe((workflow) => {
        this.entity = workflow;
        if (!workflow.id) {
          this.associatedReports = [];
          this.canLoadMoreReports = false;
          return;
        }

        this.loadReports(true);
      });
  }

  openReport(reportId?: number) {
    if (!reportId || !this.entity?.id) return;
    this.router.navigate(['../logs', reportId], { relativeTo: this.route });
  }

  deleteReport(reportId?: number) {
    if (!reportId || !this.entity?.id) return;
    this.facade.deleteReport(reportId).subscribe(() => {
      this.loadReports(true);
    });
  }

  loadMoreReports() {
    this.loadReports(false);
  }

  private loadReports(reset: boolean) {
    if (!this.entity?.id || this.loadingReports) return;

    const offset = reset ? 0 : this.associatedReports.length;
    if (reset) {
      this.associatedReports = [];
      this.canLoadMoreReports = false;
    }

    this.loadingReports = true;
    this.facade.getReports(this.entity.id, {
      limit: this.reportBatchSize + 1,
      offset,
    }).subscribe({
      next: (reports) => {
        const visibleReports = reports.slice(0, this.reportBatchSize);
        this.associatedReports = reset ? visibleReports : [...this.associatedReports, ...visibleReports];
        this.canLoadMoreReports = reports.length > this.reportBatchSize;
        this.loadingReports = false;
      },
      error: () => {
        this.loadingReports = false;
        this.canLoadMoreReports = false;
      }
    });
  }
}
