import { ImportProgress, isImportStopping } from 'src/app/shared/import-progress';
import { shareReplay, tap, finalize } from 'rxjs';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, Subject, firstValueFrom, from, map, takeUntil } from 'rxjs';
import { EnrichService } from 'src/app/administration/services/enrich.service';
import { ReportService } from 'src/app/administration/services/report.service';
import { LogDialogComponent } from 'src/app/administration/components/log-dialog/log-dialog.component';
import { ImportConfigComponent } from '../../components/import-config/import-config.component';

@Component({
    selector: 'app-enrich',
    templateUrl: './enrich.component.html',
    styleUrls: ['./enrich.component.css'],
    standalone: false
})
export class EnrichComponent implements OnInit, OnDestroy {

  subjects: Subject<any>[] = [];

  reportFiles = [];
  enrichs = [];
  status = [];
  runningEnrichs = [];

  obs$: Observable<ImportProgress>[] = [];

  current_progress = [];
  readonly stoppingPaths = new Set<string>();
  private readonly startingPaths = new Set<string>();
  private readonly seenActivePaths = new Set<string>();
  private readonly destroy$ = new Subject<void>();

  public forms: FormGroup[] = [];

  constructor(private reportService: ReportService, private enrichService: EnrichService, private formBuilder: FormBuilder, private dialog: MatDialog, private _snackBar: MatSnackBar) { }

  async ngOnInit() {
    try {
      this.enrichs = await firstValueFrom(this.enrichService.getEnrichs().pipe(takeUntil(this.destroy$)));
      for (const im of this.enrichs) {
        this.subjects[im.label] = new Subject<any>();
        this.forms[im.label] = this.formBuilder.group({
          reporting_year: ['', Validators.required],
          dry_run: [false],
        });
      }
      this.reportService.getReports('Enrich').pipe(takeUntil(this.destroy$)).subscribe({
        next: files => this.reportFiles = files.sort((a, b) => b.localeCompare(a)),
        error: () => this.showError('Reports konnten nicht geladen werden.'),
      });
      this.updateStatus().pipe(takeUntil(this.destroy$)).subscribe({ error: () => this.showError('Status konnte nicht geladen werden.') });
      const running = await firstValueFrom(from(this.enrichService.isRunning()).pipe(takeUntil(this.destroy$)));
      for (const im of running) this.monitorRun(im);
    } catch {
      if (!this.destroy$.isStopped) this.showError('Backend nicht erreichbar.');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  updateStatus() {
    return from(this.enrichService.getStatus()).pipe(map(
      data => {
        this.status = data;
      }))
  }

  getReports(import_label: string) {
    return this.reportFiles?.filter(e => e.includes(import_label))
  }

  startImport(im): void {
    if (this.obs$[im.label] || this.startingPaths.has(im.path)) return;
    const form = this.forms[im.label];
    if (form.invalid) return;
    const values = form.getRawValue();
    const request = this.enrichService.startYear(im.path, values.reporting_year, values.dry_run);
    this.startingPaths.add(im.path);
    this.monitorRun(im);
    request.pipe(finalize(() => this.startingPaths.delete(im.path)), takeUntil(this.destroy$)).subscribe({
      next: () => this.startingPaths.delete(im.path),
      error: () => {
        this.finishMonitoring(im, false);
        this.showError('Anreicherung konnte nicht gestartet werden.');
      },
    });
  }

  isStarting(path: string): boolean { return this.startingPaths.has(path); }

  isRunning(path: string): boolean {
    return this.runningEnrichs.some(im => im.path === path);
  }

  stop(im): void {
    if (!this.isRunning(im.path) || this.stoppingPaths.has(im.path)) return;
    this.stoppingPaths.add(im.path);
    this.enrichService.stop(im.path).pipe(takeUntil(this.destroy$)).subscribe({
      next: result => {
        if (result.state === 'stopping') {
          this._snackBar.open('Stopp angefordert. Begonnene Datensätze werden noch abgeschlossen.', 'OK', { duration: 4500 });
        }
      },
      error: () => {
        this.stoppingPaths.delete(im.path);
        this.showError('Anreicherung konnte nicht gestoppt werden. Bitte erneut versuchen.');
      },
    });
  }

  private monitorRun(im): void {
    if (this.obs$[im.label]) return;
    this.forms[im.label].disable();
    if (!this.startingPaths.has(im.path)) this.runningEnrichs.push(im);
    const progress = this.enrichService.getProgress(im.path).pipe(
      takeUntil(this.subjects[im.label]),
      takeUntil(this.destroy$),
      tap(data => {
        this.status[this.enrichs.findIndex(entry => entry.path === im.path)] = data.status;
        if (data.progress !== 0) {
          this.seenActivePaths.add(im.path);
          if (!this.isRunning(im.path)) this.runningEnrichs.push(im);
          if (isImportStopping(data)) this.stoppingPaths.add(im.path);
        } else if (!this.startingPaths.has(im.path) || this.seenActivePaths.has(im.path)) {
          this.finishMonitoring(im);
        }
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.obs$[im.label] = progress;
    progress.subscribe({ error: () => this.showError('Laufstatus konnte nicht geladen werden. Bitte die Seite neu laden.') });
  }

  private finishMonitoring(im, refresh = true): void {
    this.runningEnrichs = this.runningEnrichs.filter(entry => entry.path !== im.path);
    if (!refresh) this.startingPaths.delete(im.path);
    this.seenActivePaths.delete(im.path);
    this.stoppingPaths.delete(im.path);
    this.obs$[im.label] = undefined;
    this.subjects[im.label].next('');
    this.forms[im.label].enable();
    if (refresh) {
      this.reportService.getReports('Enrich').pipe(takeUntil(this.destroy$)).subscribe({
        next: files => this.reportFiles = files.sort((a, b) => b.localeCompare(a)),
        error: () => this.showError('Reports konnten nicht geladen werden.'),
      });
    }
  }

  private showError(message: string): void {
    this._snackBar.open(message, 'OK', { duration: 5000, panelClass: ['danger-snackbar'], verticalPosition: 'top' });
  }

  openLog(rep) {
    this.reportService.getReport('Enrich', rep).subscribe({
      next: data => {
        let dialogRef = this.dialog.open(LogDialogComponent, {
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
    this.reportService.deleteReport('Enrich', rep).subscribe({
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
