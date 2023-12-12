import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { ExportService } from 'src/app/services/export.service';
import { ReportService } from 'src/app/services/report.service';
import { Observable, Subject, firstValueFrom, from, map, takeUntil } from 'rxjs';
import { environment } from 'src/environments/environment';
import { LogDialogComponent } from 'src/app/tools/log-dialog/log-dialog.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-export',
  templateUrl: './export.component.html',
  styleUrls: ['./export.component.css']
})
export class ExportComponent implements OnInit {

  constructor(private exportService: ExportService, private reportService: ReportService, private dialog: MatDialog) { }

  reportFiles = [];
  enrichs = [];
  status = [];

  async ngOnInit() {
    this.reportService.getReports('export').subscribe({
      next: data => {
        this.reportFiles = data.sort((a, b) => b.localeCompare(a));
      }
    })
    this.enrichs = await firstValueFrom(this.exportService.getExports());
    this.updateStatus();
  }

  updateStatus() {
    from(this.exportService.getStatus()).subscribe({
      next: data => {
        this.status = data;
      }
    })
  }

  getReports(import_label: string) {
    return this.reportFiles?.filter(e => e.includes(import_label))
  }

  startImport(importO) {
    this.exportService.startExport(importO.path).subscribe({
      next: data => {
        let csvData = new Blob(['\ufeff', data], { type: 'text/csv;charset=utf-8;' });
        let csvURL = null;
        csvURL = window.URL.createObjectURL(csvData);
        let filename = 'Export_' + importO.label + '_' + (new Date().toISOString()) + '.csv';
        let tempLink = document.createElement('a');
        tempLink.href = csvURL;
        tempLink.setAttribute('download', `${filename}`);
        tempLink.click();
        this.reportService.getReports('Export').subscribe({
          next: data => {
            this.reportFiles = data.sort((a, b) => b.localeCompare(a));;
          }
        })
        this.updateStatus();
      }
    })
  }

  openLog(rep) {
    this.reportService.getReport('Enrich', rep).subscribe({
      next: data => {
        let dialogRef = this.dialog.open(LogDialogComponent, {
          width: '800px',
          maxHeight: '800px',
          data: {
            data,
            label: rep
          }
        });
        dialogRef.afterClosed().subscribe(result => {
        });
      }
    })
  }

  delete(rep) {
    this.reportService.deleteReport('Export', rep).subscribe({
      next: data => {
        this.reportService.getReports('Export').subscribe({
          next: data => {
            this.reportFiles = data.sort((a, b) => b.localeCompare(a));;
          }
        })
      }
    })
  }

  getLink() {
    return '/administration/export'
  }

  getLabel() {
    return '/Verwaltung/Exports'
  }
}
