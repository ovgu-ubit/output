import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, Subject, firstValueFrom, from, map, takeUntil } from 'rxjs';
import { EnrichService } from 'src/app/services/enrich.service';
import { ReportService } from 'src/app/services/report.service';
import { LogDialogComponent } from 'src/app/tools/log-dialog/log-dialog.component';
import { ImportConfigComponent } from '../../windows/import-config/import-config.component';

@Component({
  selector: 'app-enrich',
  templateUrl: './enrich.component.html',
  styleUrls: ['./enrich.component.css']
})
export class EnrichComponent implements OnInit {

  subjects: Subject<any>[] = [];

  reportFiles = [];
  enrichs = [];
  status = [];
  runningEnrichs = [];

  obs$: Observable<{ progress: number, status: string }>[] = [];

  current_progress = [];

  public forms: FormGroup[] = [];

  constructor(private reportService: ReportService, private enrichService: EnrichService, private formBuilder: FormBuilder, private dialog: MatDialog) { }

  async ngOnInit() {
    this.reportService.getReports('Enrich').subscribe({
      next: data => {
        this.reportFiles = data.sort((a, b) => b.localeCompare(a));
      }
    })
    this.enrichs = await firstValueFrom(this.enrichService.getEnrichs());
    for (let im of this.enrichs) {
      this.subjects[im.label] = new Subject<any>();
      this.forms[im.label] = this.formBuilder.group({
        reporting_year: ['', Validators.required]
      });
    }
    from(this.enrichService.isRunning()).subscribe({
      next: data => {
        this.runningEnrichs = data;
        for (let ri of this.runningEnrichs) {
          this.forms[ri.label].disable();
          this.obs$[ri.label] = this.enrichService.getProgress(ri.path).pipe(takeUntil(this.subjects[ri.label]), map(data => {
            if (data.progress === 0 || data.progress === 1) {//finish signal
              this.runningEnrichs = this.runningEnrichs.filter(e => e.label !== ri.label)
              this.obs$[ri.label] = undefined;
              this.updateStatus();
              this.forms[ri.label].enable();
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
    from(this.enrichService.getStatus()).subscribe({
      next: data => {
        this.status = data;
      }
    })
  }

  getReports(import_label: string) {
    return this.reportFiles?.filter(e => e.includes(import_label))
  }

  startImport(importO) {
    if (this.forms[importO.label].invalid) return;
    this.forms[importO.label].disable();
    this.enrichService.startYear(importO.path, this.forms[importO.label].get('reporting_year').value).subscribe({
      next: data => {
        this.runningEnrichs.push(importO)
        this.obs$[importO.label] = this.enrichService.getProgress(importO.path).pipe(takeUntil(this.subjects[importO.label]), map(data => {
          if (data.progress === 0 || data.progress === 1) {//finish signal
            this.runningEnrichs = this.runningEnrichs.filter(e => e.label !== importO.label)
            this.obs$[importO.label] = undefined;
            this.updateStatus();
            this.forms[importO.label].enable();

            this.reportService.getReports('Enrich').subscribe({
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
    this.reportService.getReport('Enrich',rep).subscribe({
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
    this.reportService.deleteReport('Enrich',rep).subscribe({
      next: data => {
        this.reportService.getReports('Enrich').subscribe({
          next: data => {
            this.reportFiles = data.sort((a, b) => b.localeCompare(a));;
          }
        })
      }
    })
  }

  configureImport(im) {
    let dialogRef = this.dialog.open(ImportConfigComponent, {
      width: '800px',
      maxHeight: '800px',
      data: {
        enrich: im
      }
    });
    dialogRef.afterClosed().subscribe(result => {

    });
  }

  getLink() {
    return '/administration/enrich'
  }

  getLabel() {
    return '/Verwaltung/Anreicherungen'
  }
}
