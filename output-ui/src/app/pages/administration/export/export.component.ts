import { Component, OnInit, ViewChildren } from '@angular/core';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Store } from '@ngrx/store';
import { Observable, concatMap, firstValueFrom, from, map, merge } from 'rxjs';
import { ExportService } from 'src/app/services/export.service';
import { selectViewConfig } from 'src/app/services/redux';
import { ReportService } from 'src/app/services/report.service';
import { LogDialogComponent } from 'src/app/tools/log-dialog/log-dialog.component';

@Component({
  selector: 'app-export',
  templateUrl: './export.component.html',
  styleUrls: ['./export.component.css']
})
export class ExportComponent implements OnInit {

  constructor(private exportService: ExportService, private reportService: ReportService, private dialog: MatDialog,
    private store: Store, private _snackBar: MatSnackBar) { }

  reportFiles = [];
  enrichs = [];
  status = [];
  filter = null;
  @ViewChildren(MatCheckbox) checkboxes;

  async ngOnInit() {
    let ob$: Observable<any> = this.store.select(selectViewConfig).pipe(map(data => {
      this.filter = data.filter;
    }));
    ob$ = merge(ob$,  this.reportService.getReports('export').pipe(map(data => {
      this.reportFiles = data.sort((a, b) => b.localeCompare(a));
    })));
    ob$ = merge(ob$,  this.updateStatus());
    ob$.subscribe({
      error: err => this._snackBar.open(`Backend nicht erreichbar`, 'Oh oh!', {
        panelClass: [`danger-snackbar`],
        verticalPosition: 'top'
      })
    })
    this.enrichs = await firstValueFrom(this.exportService.getExports());
    this.enrichs = this.enrichs.map(e => { return { ...e, filter: false } })
  }

  updateStatus() {
    return from(this.exportService.getStatus()).pipe(map(
      data => {
        this.status = data;
      }));
  }

  getReports(import_label: string) {
    return this.reportFiles?.filter(e => e.includes(import_label))
  }

  startImport(importO) {
    let idx = this.enrichs.findIndex(e => e === importO)
    let filter = null;
    if (this.checkboxes.get(idx).checked) filter = this.filter;
    this.exportService.startExport(importO.path, filter).subscribe({
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
        this.updateStatus().subscribe();
      }, error: err => this._snackBar.open(`Backend nicht erreichbar`, 'Oh oh!', {
        panelClass: [`danger-snackbar`],
        verticalPosition: 'top'
      })
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
