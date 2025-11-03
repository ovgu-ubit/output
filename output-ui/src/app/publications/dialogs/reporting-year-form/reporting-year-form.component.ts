import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ConfigService } from 'src/app/administration/services/config.service';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { PublicationService } from 'src/app/services/entities/publication.service';

@Component({
  selector: 'app-reporting-year-form',
  templateUrl: './reporting-year-form.component.html',
  styleUrls: ['./reporting-year-form.component.css'],
  standalone: false
})
export class ReportingYearFormComponent implements OnInit {
  submitted = false;
  checked = false;

  reporting_year: string;
  reporting_years: number[];

  constructor(public dialogRef: MatDialogRef<ReportingYearFormComponent>,
    @Inject(MAT_DIALOG_DATA) public dialogData: any, private configService: ConfigService,
    private pubService: PublicationService, public tokenService: AuthorizationService) { }


  ngOnInit(): void {
    this.reporting_year = this.dialogData.reporting_year + '';
    this.pubService.getReportingYears().subscribe({
      next: data => this.reporting_years = data.map(e => e['year'])
    })
  }

  abort(): void {
    this.dialogRef.close(undefined)
  }

  action(): void {
    this.submitted = true;
    if (this.checked) {
      let yop;
      if (!this.reporting_year) yop = null;
      else yop = Number(this.reporting_year)
      this.configService.set("reporting_year", yop).subscribe();
    }
    this.dialogRef.close(this.reporting_year);
  }
}
