import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { SharedModule } from 'src/app/shared/shared.module';
import { ImportFormFacade } from '../import-form-facade.service';
import { ImportWorkflow } from '../../../../../../../output-interfaces/Workflow';
import { LogDialogComponent } from 'src/app/administration/components/log-dialog/log-dialog.component';
import { filter, takeUntil } from 'rxjs';

@Component({
  selector: 'app-import-form-overview',
  imports: [SharedModule],
  templateUrl: './import-form-overview.component.html',
  styleUrl: './import-form-overview.component.css',
})
export class ImportFormOverviewComponent implements OnInit {
  workflowReportName = '';
  entity: ImportWorkflow;
  associatedReports: string[] = [];

  constructor(private dialog: MatDialog, private facade: ImportFormFacade) { }

  ngOnInit() {
    this.facade.import$.pipe(filter((e): e is ImportWorkflow => e != null), takeUntil(this.facade.destroy$)).subscribe((workflow) => {
      if (!workflow) return;

      this.workflowReportName = `${workflow.label}_v${workflow.version}`;
      this.facade.getReports(this.workflowReportName).subscribe((reports) => {
        this.associatedReports = reports;
      });
    });
  }

  requestReport(reportName: string) {
    this.facade.requestReport(reportName).subscribe((data) => {
      this.dialog.open(LogDialogComponent, {
        data: {
          data,
          label: reportName,
        },
      });
    });
  }

  deleteReport(reportName: string) {
    this.facade.deleteReport(reportName).subscribe((data) => {
      this.ngOnInit();
    });
  }
}
