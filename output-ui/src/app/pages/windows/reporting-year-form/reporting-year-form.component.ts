import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { PublicationService } from 'src/app/services/entities/publication.service';

@Component({
  selector: 'app-reporting-year-form',
  templateUrl: './reporting-year-form.component.html',
  styleUrls: ['./reporting-year-form.component.css']
})
export class ReportingYearFormComponent implements OnInit{
  submitted = false;
  checked = false;

  reporting_year:string;
  reporting_years:number[];

  constructor(public dialogRef: MatDialogRef<ReportingYearFormComponent>,
    @Inject(MAT_DIALOG_DATA) public dialogData: any, private pubService:PublicationService,
    public tokenService: AuthorizationService) {}


  ngOnInit(): void {
    this.reporting_year = this.dialogData.reporting_year+'';
    /*this.pubService.getDefaultReportingYear().subscribe({
      next: data => this.reporting_year = data+''
    })*/
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
      if (!this.reporting_year) yop = null; else yop = Number(this.reporting_year)
      this.pubService.setDefaultReportingYear(yop).subscribe();
    }
    this.dialogRef.close(this.reporting_year);
  }
}
