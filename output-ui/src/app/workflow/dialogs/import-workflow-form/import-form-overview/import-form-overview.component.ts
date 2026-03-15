import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { filter, takeUntil } from 'rxjs';
import { ImportWorkflow, WorkflowReport } from '../../../../../../../output-interfaces/Workflow';
import { SharedModule } from 'src/app/shared/shared.module';
import { ImportFormFacade } from '../import-form-facade.service';

@Component({
  selector: 'app-import-form-overview',
  imports: [SharedModule],
  templateUrl: './import-form-overview.component.html',
  styleUrl: './import-form-overview.component.css',
})
export class ImportFormOverviewComponent implements OnInit {
  entity: ImportWorkflow | null = null;
  associatedReports: WorkflowReport[] = [];

  constructor(private facade: ImportFormFacade, private router: Router, private route: ActivatedRoute) { }

  ngOnInit() {
    this.facade.import$
      .pipe(filter((e): e is ImportWorkflow => e != null), takeUntil(this.facade.destroy$))
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
