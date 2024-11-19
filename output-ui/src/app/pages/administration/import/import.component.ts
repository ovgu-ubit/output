import { Component, OnInit, ViewChild } from '@angular/core';
import { ImportService } from 'src/app/services/import.service';
import { ReportService } from 'src/app/services/report.service';
import { Observable, Subject, firstValueFrom, from, map, merge, takeUntil } from 'rxjs';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { LogDialogComponent } from 'src/app/tools/log-dialog/log-dialog.component';
import { ImportConfigComponent } from '../../../tools/import-config/import-config.component';
import { CSVMapping } from '../../../../../../output-interfaces/Config';
import { CsvFormatComponent } from 'src/app/tools/csv-format/csv-format.component';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-import',
  templateUrl: './import.component.html',
  styleUrls: ['./import.component.css']
})
export class ImportComponent implements OnInit {

  subjects: Subject<any>[] = [];

  reportFiles = [];
  imports = [];
  status = [];
  runningImports = [];

  obs$: Observable<{ progress: number, status: string }>[] = [];

  current_progress = [];

  csv_format: CSVMapping;
  file: File;

  public forms: FormGroup[] = [];

  constructor(private reportService: ReportService, private importService: ImportService, private formBuilder: FormBuilder, private dialog: MatDialog,
    private _snackBar: MatSnackBar) { }

  async ngOnInit() {
    let ob$:Observable<any> = this.reportService.getReports('Import').pipe(map(
      data => {
        this.reportFiles = data.sort((a, b) => b.localeCompare(a));
      }));
    ob$ = merge(ob$, from(this.importService.isRunning()).pipe(map(
      data => {
        this.runningImports = data;
        for (let ri of this.runningImports) {
          this.forms[ri.label].disable();
          this.obs$[ri.label] = this.importService.getProgress(ri.path).pipe(takeUntil(this.subjects[ri.label]), map(data => {
            if (data.progress === 0 || data.progress >= 1) {//finish signal
              this.runningImports = this.runningImports.filter(e => e.label !== ri.label)
              this.obs$[ri.label] = undefined;
              this.updateStatus().subscribe();
              this.forms[ri.label].enable();
              this.subjects[ri.label].next('');
            }
            return data;
          }));
        }
      })));
    ob$ = merge(ob$, this.updateStatus());
    ob$.subscribe({
      error: err => {
        this._snackBar.open(`Backend nicht erreichbar`, 'Oh oh!', {
        panelClass: [`danger-snackbar`],
        verticalPosition: 'top'
      })
      console.log(err)
    }
    })
    this.imports = await firstValueFrom(this.importService.getImports());
    for (let im of this.imports) {
      this.subjects[im.label] = new Subject<any>();
      this.forms[im.label] = this.formBuilder.group({
        reporting_year: ['', Validators.required],
        update: [''],
      });
    }
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

  startImport(importO) {
    if (importO.path !== 'csv' && importO.path !== 'xls') {
      if (this.forms[importO.label].invalid) return;
      this.forms[importO.label].disable();
      this.importService.start(importO.path, this.forms[importO.label].get('update').value, this.forms[importO.label].get('reporting_year').value).subscribe({
        next: data => {
          this.runningImports.push(importO)
          this.obs$[importO.label] = this.importService.getProgress(importO.path).pipe(takeUntil(this.subjects[importO.label]), map(data => {
            if (data.progress === 0 || data.progress >= 1) {//finish signal
              this.runningImports = this.runningImports.filter(e => e.label !== importO.label)
              this.obs$[importO.label] = undefined;
              this.updateStatus().subscribe();
              this.forms[importO.label].enable();

              this.reportService.getReports('Import').subscribe({
                next: data => {
                  this.reportFiles = data;
                }
              })
              this.subjects[importO.label].next('');
            }
            return data;
          }));
        }, error: err => this._snackBar.open(`Backend nicht erreichbar`, 'Oh oh!', {
          panelClass: [`danger-snackbar`],
          verticalPosition: 'top'
        })
      });
    } else if (importO.path === 'csv') { //CSV Import
      if (!this.file || !this.file.name.endsWith('csv') || !this.csv_format) {
        this._snackBar.open(`CSV-Format oder Datei nicht ausgewählt.`, 'Ok...', {
          duration: 5000,
          panelClass: [`danger-snackbar`],
          verticalPosition: 'top'
        });
      } else {
        this.forms[importO.label].disable();
        let formData = new FormData();
        formData.append("file",this.file)
        formData.append("update",this.forms[importO.label].get('update').value)
        formData.append("format",JSON.stringify(this.csv_format))
        this.importService.startCSV(formData).subscribe({
          next: data => {
            this.runningImports.push(importO)
            this.obs$[importO.label] = this.importService.getProgress(importO.path).pipe(takeUntil(this.subjects[importO.label]), map(data => {
              if (data.progress === 0 || data.progress >= 1) {//finish signal
                this.runningImports = this.runningImports.filter(e => e.label !== importO.label)
                this.obs$[importO.label] = undefined;
                this.updateStatus().subscribe();
                this.forms[importO.label].enable();

                this.reportService.getReports('Import').subscribe({
                  next: data => {
                    this.reportFiles = data;
                  }
                })
                this.subjects[importO.label].next('');
              }
              return data;
            }));
          }, error: err => this._snackBar.open(`Backend nicht erreichbar`, 'Oh oh!', {
            panelClass: [`danger-snackbar`],
            verticalPosition: 'top'
          })
        });
      }
    } else { //Excel Import
      if (!this.file || !this.file.name.endsWith('xlsx') || !this.csv_format) {
        this._snackBar.open(`CSV-Format oder Datei nicht ausgewählt.`, 'Ok...', {
          duration: 5000,
          panelClass: [`danger-snackbar`],
          verticalPosition: 'top'
        });
      } else {
        this.forms[importO.label].disable();
        let formData = new FormData();
        formData.append("file",this.file)
        formData.append("update",this.forms[importO.label].get('update').value)
        formData.append("format",JSON.stringify(this.csv_format))
        this.importService.startExcel(formData).subscribe({
          next: data => {
            this.runningImports.push(importO)
            this.obs$[importO.label] = this.importService.getProgress(importO.path).pipe(takeUntil(this.subjects[importO.label]), map(data => {
              if (data.progress === 0 || data.progress >= 1) {//finish signal
                this.runningImports = this.runningImports.filter(e => e.label !== importO.label)
                this.obs$[importO.label] = undefined;
                this.updateStatus().subscribe();
                this.forms[importO.label].enable();

                this.reportService.getReports('Import').subscribe({
                  next: data => {
                    this.reportFiles = data;
                  }
                })
                this.subjects[importO.label].next('');
              }
              return data;
            }));
          }, error: err => this._snackBar.open(`Backend nicht erreichbar`, 'Oh oh!', {
            panelClass: [`danger-snackbar`],
            verticalPosition: 'top'
          })
        });
      }
    }
  }

  openLog(rep) {
    this.reportService.getReport('Import',rep).subscribe({
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
    this.reportService.deleteReport('Import',rep).subscribe({
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

  csvFormat(path:string) {
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
