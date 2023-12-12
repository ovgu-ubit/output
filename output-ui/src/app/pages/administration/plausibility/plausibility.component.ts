import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Observable, Subject,firstValueFrom,from,takeUntil,map } from 'rxjs';
import { PlausibilityService } from 'src/app/services/plausibility.service';
import { ReportService } from 'src/app/services/report.service';
import { LogDialogComponent } from 'src/app/tools/log-dialog/log-dialog.component';

@Component({
  selector: 'app-plausibility',
  templateUrl: './plausibility.component.html',
  styleUrls: ['./plausibility.component.css']
})
export class PlausibilityComponent implements OnInit {

  subjects: Subject<any>[] = [];

  reportFiles = [];
  enrichs = [];
  status = [];
  runningEnrichs = [];

  obs$: Observable<{ progress: number, status: string }>[] = [];

  current_progress = [];

  constructor(private reportService: ReportService, private plausibiltiyService: PlausibilityService, private formBuilder: FormBuilder, private dialog: MatDialog) { }

  async ngOnInit() {
    this.reportService.getReports('check').subscribe({
      next: data => {
        this.reportFiles = data.sort((a, b) => b.localeCompare(a));
      }
    })
    this.enrichs = await firstValueFrom(this.plausibiltiyService.getExports());
    for (let im of this.enrichs) {
      this.subjects[im.label] = new Subject<any>();
    }
    from(this.plausibiltiyService.isRunning()).subscribe({
      next: data => {
        this.runningEnrichs = data;
        for (let ri of this.runningEnrichs) {
          this.obs$[ri.label] = this.plausibiltiyService.getProgress(ri.path).pipe(takeUntil(this.subjects[ri.label]), map(data => {
            if (data.progress === 0 || data.progress === 1) {//finish signal
              this.runningEnrichs = this.runningEnrichs.filter(e => e.label !== ri.label)
              this.obs$[ri.label] = undefined;
              this.updateStatus();
              this.subjects[ri.label].next('');
            }
            return data;
          }));
        }
      }
    })
    this.updateStatus();
  }

  updateStatus() {
    from(this.plausibiltiyService.getStatus()).subscribe({
      next: data => {
        this.status = data;
      }
    })
  }

  getReports(import_label: string) {
    return this.reportFiles?.filter(e => e.includes(import_label))
  }

  startImport(importO) {
    this.plausibiltiyService.startExport(importO.path).subscribe({
      next: data => {
        this.runningEnrichs.push(importO)
        this.obs$[importO.label] = this.plausibiltiyService.getProgress(importO.path).pipe(takeUntil(this.subjects[importO.label]), map(data => {
          if (data.progress === 0 || data.progress === 1) {//finish signal
            this.runningEnrichs = this.runningEnrichs.filter(e => e.label !== importO.label)
            this.obs$[importO.label] = undefined;
            this.updateStatus();

            this.reportService.getReports('Check').subscribe({
              next: data => {
                this.reportFiles = data.sort((a, b) => b.localeCompare(a));;
              }
            })
            this.subjects[importO.label].next('');
          }
          return data;
        }));
      }, error: err => {
        console.log('running')
      }
    });
  }

  openLog(rep) {
    this.reportService.getReport('Check',rep).subscribe({
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
    this.reportService.deleteReport('Check',rep).subscribe({
      next: data => {
        this.reportService.getReports('Check').subscribe({
          next: data => {
            this.reportFiles = data.sort((a, b) => b.localeCompare(a));;
          }
        })
      }
    })
  }

  getLink() {
    return '/administration/check'
  }

  getLabel() {
    return '/Verwaltung/Plausibilitätschecks'
  }
}

