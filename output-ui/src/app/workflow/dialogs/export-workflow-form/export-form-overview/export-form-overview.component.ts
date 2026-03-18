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
  entity: ExportWorkflow | null = null;
  associatedReports: WorkflowReport[] = [];

  constructor(private facade: ExportFormFacade, private router: Router, private route: ActivatedRoute) { }

  ngOnInit() {
    this.facade.export$
      .pipe(filter((e): e is ExportWorkflow => e != null), takeUntil(this.facade.destroy$))
      .subscribe((workflow) => {
        this.entity = workflow;
        if (!workflow.id) {
          this.associatedReports = [];
          return;
        }

        this.facade.getReports(workflow.id).subscribe((reports) => {
          this.associatedReports = reports;
        });
      });
  }

  openReport(reportId?: number) {
    if (!reportId || !this.entity?.id) return;
    this.router.navigate(['../logs', reportId], { relativeTo: this.route });
  }

  deleteReport(reportId?: number) {
    if (!reportId || !this.entity?.id) return;
    this.facade.deleteReport(reportId).subscribe(() => {
      this.facade.getReports(this.entity!.id!).subscribe((reports) => {
        this.associatedReports = reports;
      });
    });
  }
}
