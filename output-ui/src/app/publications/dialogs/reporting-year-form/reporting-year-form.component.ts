import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ConfigService } from 'src/app/administration/services/config.service';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { PublicationService } from 'src/app/services/entities/publication.service';

const ALL_REPORTING_YEARS = 'all' as const;

export interface ReportingYearSelection {
  reportingYear: number | null;
  allReportingYears: boolean;
}

@Component({
  selector: 'app-reporting-year-form',
  templateUrl: './reporting-year-form.component.html',
  styleUrls: ['./reporting-year-form.component.css'],
  standalone: false
})
export class ReportingYearFormComponent implements OnInit {
  readonly allReportingYearsValue = ALL_REPORTING_YEARS;

  submitted = false;
  checked = false;

  reporting_year: number | null | typeof ALL_REPORTING_YEARS;
  reporting_years: Array<number | null>;

  constructor(public dialogRef: MatDialogRef<ReportingYearFormComponent>,
    @Inject(MAT_DIALOG_DATA) public dialogData: any, private configService: ConfigService,
    private pubService: PublicationService, public tokenService: AuthorizationService) { }


  ngOnInit(): void {
    this.reporting_year = this.dialogData.allReportingYears === true
      ? this.allReportingYearsValue
      : this.dialogData.reporting_year;
    this.pubService.getReportingYears().subscribe({
      next: data => this.reporting_years = data.map(e => e['year'])
    })
  }

  abort(): void {
    this.dialogRef.close(undefined)
  }

  action(): void {
    this.submitted = true;
    const allReportingYears = this.isAllReportingYears();
    if (this.checked && !allReportingYears) {
      this.configService.set("reporting_year", this.reporting_year).subscribe();
    }
    this.dialogRef.close({
      reportingYear: allReportingYears ? this.dialogData.reporting_year : this.reporting_year,
      allReportingYears,
    } satisfies ReportingYearSelection);
  }

  isAllReportingYears(): boolean {
    return this.reporting_year === this.allReportingYearsValue;
  }

  reportingYearChanged(): void {
    if (this.isAllReportingYears()) this.checked = false;
  }
}
