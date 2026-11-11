import { ImportProgress, isImportStopping } from 'src/app/shared/import-progress';
import { shareReplay, tap, finalize } from 'rxjs';
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { ImportService } from 'src/app/administration/services/import.service';
import { ReportService } from 'src/app/administration/services/report.service';
import { Observable, Subject, firstValueFrom, from, map, takeUntil } from 'rxjs';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { LogDialogComponent } from 'src/app/administration/components/log-dialog/log-dialog.component';
import {  CSVMapping  } from '@output/interfaces';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ImportConfigComponent } from '../../components/import-config/import-config.component';
import { CsvFormatComponent } from '../../components/csv-format/csv-format.component';

@Component({
  selector: 'app-import',
  templateUrl: './import.component.html',
  styleUrls: ['./import.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class ImportComponent implements OnInit, OnDestroy {

  subjects: Subject<any>[] = [];

  reportFiles = [];
  imports = [];
  status = [];
  runningImports = [];

  obs$: Observable<ImportProgress>[] = [];

  current_progress = [];
  readonly stoppingPaths = new Set<string>();
  private readonly startingPaths = new Set<string>();
  private readonly seenActivePaths = new Set<string>();
  private readonly destroy$ = new Subject<void>();

  csv_format: CSVMapping;
  file: File;

  public forms: FormGroup[] = [];

  constructor(private reportService: ReportService, private importService: ImportService, private formBuilder: FormBuilder, private dialog: MatDialog,
    private _snackBar: MatSnackBar) { }

  async ngOnInit() {
    try {
      this.imports = await firstValueFrom(this.importService.getImports().pipe(takeUntil(this.destroy$)));
      for (const im of this.imports) {
        this.subjects[im.label] = new Subject<any>();
        this.forms[im.label] = this.formBuilder.group({
          reporting_year: ['', Validators.required],
          update: [false],
          dry_run: [false],
        });
      }
      this.reportService.getReports('Import').pipe(takeUntil(this.destroy$)).subscribe({
        next: files => this.reportFiles = files.sort((a, b) => b.localeCompare(a)),
        error: () => this.showError('Reports konnten nicht geladen werden.'),
      });
      this.updateStatus().pipe(takeUntil(this.destroy$)).subscribe({ error: () => this.showError('Status konnte nicht geladen werden.') });
      const running = await firstValueFrom(from(this.importService.isRunning()).pipe(takeUntil(this.destroy$)));
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
    return from(this.importService.getStatus()).pipe(map(
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
    const values = form.getRawValue();
    let request: Observable<unknown>;
    if (im.path === 'csv' || im.path === 'xls') {
      const extension = im.path === 'csv' ? '.csv' : '.xlsx';
      if (!this.file?.name.toLowerCase().endsWith(extension) || !this.csv_format) {
        this.showError('Importformat oder Datei nicht ausgewählt.');
        return;
      }
      const formData = new FormData();
      formData.append('file', this.file);
      formData.append('update', values.update ? 'true' : 'false');
      formData.append('dry_run', values.dry_run ? 'true' : 'false');
      formData.append('format', JSON.stringify(this.csv_format));
      request = im.path === 'csv' ? this.importService.startCSV(formData) : this.importService.startExcel(formData);
    } else {
      if (form.invalid) return;
      request = this.importService.start(im.path, values.update, values.reporting_year, values.dry_run);
    }
    this.startingPaths.add(im.path);
    this.monitorRun(im);
    request.pipe(finalize(() => this.startingPaths.delete(im.path)), takeUntil(this.destroy$)).subscribe({
      next: () => this.startingPaths.delete(im.path),
      error: () => {
        this.finishMonitoring(im, false);
        this.showError('Import konnte nicht gestartet werden.');
      },
    });
  }

  isStarting(path: string): boolean { return this.startingPaths.has(path); }

  isRunning(path: string): boolean {
    return this.runningImports.some(im => im.path === path);
  }

  stop(im): void {
    if (!this.isRunning(im.path) || this.stoppingPaths.has(im.path)) return;
    this.stoppingPaths.add(im.path);
    this.importService.stop(im.path).pipe(takeUntil(this.destroy$)).subscribe({
      next: result => {
        if (result.state === 'stopping') {
          this._snackBar.open('Stopp angefordert. Begonnene Datensätze werden noch abgeschlossen.', 'OK', { duration: 4500 });
        }
      },
      error: () => {
        this.stoppingPaths.delete(im.path);
        this.showError('Import konnte nicht gestoppt werden. Bitte erneut versuchen.');
      },
    });
  }

  private monitorRun(im): void {
    if (this.obs$[im.label]) return;
    this.forms[im.label].disable();
    if (!this.startingPaths.has(im.path)) this.runningImports.push(im);
    const progress = this.importService.getProgress(im.path).pipe(
      takeUntil(this.subjects[im.label]),
      takeUntil(this.destroy$),
      tap(data => {
        this.status[this.imports.findIndex(entry => entry.path === im.path)] = data.status;
        if (data.progress !== 0) {
          this.seenActivePaths.add(im.path);
          if (!this.isRunning(im.path)) this.runningImports.push(im);
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
    this.runningImports = this.runningImports.filter(entry => entry.path !== im.path);
    if (!refresh) this.startingPaths.delete(im.path);
    this.seenActivePaths.delete(im.path);
    this.stoppingPaths.delete(im.path);
    this.obs$[im.label] = undefined;
    this.subjects[im.label].next('');
    this.forms[im.label].enable();
    if (refresh) {
      this.reportService.getReports('Import').pipe(takeUntil(this.destroy$)).subscribe({
        next: files => this.reportFiles = files.sort((a, b) => b.localeCompare(a)),
        error: () => this.showError('Reports konnten nicht geladen werden.'),
      });
    }
  }

  private showError(message: string): void {
    this._snackBar.open(message, 'OK', { duration: 5000, panelClass: ['danger-snackbar'], verticalPosition: 'top' });
  }

  openLog(rep) {
    this.reportService.getReport('Import', rep).subscribe({
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
    this.reportService.deleteReport('Import', rep).subscribe({
      next: data => {
        this.reportService.getReports('Import').subscribe({
          next: data => {
            this.reportFiles = data;
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
        import: im
      }
    });
    dialogRef.afterClosed().subscribe(result => {

    });
  }

  csvFormat(path: string) {
    let dialogRef = this.dialog.open(CsvFormatComponent, {
      width: '800px',
      maxHeight: '800px',
      data: {
        csvFormat: this.csv_format,
        path
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) this.csv_format = result;
    });
  }

  setFile(event) {
    this.file = event.target.files[0];
  }

  getLink() {
    return '/administration/import'
  }

  getLabel() {
    return '/Verwaltung/Imports'
  }
}
