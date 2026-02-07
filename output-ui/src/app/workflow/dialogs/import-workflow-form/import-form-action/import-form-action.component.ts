import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';
import { WorkflowService } from 'src/app/workflow/workflow.service';
import { ImportFormFacade } from '../import-form-facade.service';
import { ImportWorkflow, Strategy } from '../../../../../../../output-interfaces/Workflow';
import { filter, finalize, firstValueFrom, map, Observable, Subject, takeUntil } from 'rxjs';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ImportConfigComponent } from 'src/app/administration/components/import-config/import-config.component';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-import-form-action',
  imports: [SharedModule, MatProgressBarModule],
  templateUrl: './import-form-action.component.html',
  styleUrl: './import-form-action.component.css',
})
export class ImportFormActionComponent implements OnInit {
  entity: ImportWorkflow | null = null;
  loading = false;
  subject = new Subject<any>();
  ob$: Observable<{ progress: number, status: string }>;
  isRunning = false;
  status: { progress: number, status: string };
  form: FormGroup = this.formBuilder.group({
    reporting_year: ['', Validators.required],
    update: [''],
    dry_run: [false],
  });

  constructor(
    private facade: ImportFormFacade,
    private workflowService: WorkflowService,
    private snackBar: MatSnackBar,
    private router: Router,
    private formBuilder: FormBuilder,
    private dialog: MatDialog
  ) { }

  async ngOnInit() {
    this.facade.import$.pipe(filter((e): e is ImportWorkflow => e != null), takeUntil(this.facade.destroy$)).subscribe((workflow) => {
      this.entity = workflow;
      if (this.entity.strategy_type === Strategy.URL_DOI) {
        this.form.controls.update.setValue(true)
        this.form.controls.update.disable();
      }
      this.update()
    });
  }

  async update() {
    if (!this.entity) return;
    this.isRunning = await this.workflowService.isRunning(this.entity.id);
    if (this.isRunning) {
      this.form.disable();
      this.ob$ = this.workflowService.getProgress(this.entity.id).pipe(takeUntil(this.subject), map(data => {
        if (data.progress === 0 || data.progress >= 1) {//finish signal
          this.isRunning = false;
          this.ob$ = undefined;
          this.form.enable();
          this.subject.next('');
        }
        return data;
      }));
    } else {
      this.status = await firstValueFrom(this.workflowService.getStatus(this.entity.id));
    }
  }

  get isDraft(): boolean {
    return !!this.entity && !this.entity.published_at && !this.entity.deleted_at;
  }

  get isPublished(): boolean {
    return !!this.entity && !!this.entity.published_at && !this.entity.deleted_at;
  }

  get isArchived(): boolean {
    return !!this.entity && !!this.entity.deleted_at;
  }

  publish(): void {
    if (!this.entity || !this.entity.id || this.loading) return;
    this.persistChanges({ published_at: new Date(), deleted_at: null }, 'Workflow veröffentlicht.');
  }

  archive(): void {
    if (!this.entity || !this.entity.id || this.loading) return;
    this.persistChanges({ deleted_at: new Date() }, 'Workflow archiviert.');
  }

  deleteDraft(): void {
    if (!this.entity?.id || this.loading) return;
    if (!window.confirm('Möchten Sie diesen Entwurf wirklich löschen?')) return;

    this.loading = true;
    this.workflowService
      .delete([this.entity.id])
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.snackBar.open('Entwurf wurde gelöscht.', 'OK', { duration: 3500, verticalPosition: 'top' });
          this.router.navigateByUrl('/workflow/publication_import');
        },
        error: () => {
          this.snackBar.open('Der Entwurf konnte nicht gelöscht werden.', 'OK', {
            duration: 4500,
            verticalPosition: 'top',
            panelClass: ['danger-snackbar'],
          });
        },
      });
  }

  duplicate(): void {
    if (!this.entity || this.loading) return;

    const nextVersion: ImportWorkflow = {
      ...this.entity,
      id: undefined,
      version: (this.entity.version ?? 0) + 1,
      published_at: null,
      deleted_at: null,
      created_at: null,
      modified_at: null,
    };

    this.loading = true;
    this.workflowService
      .add(nextVersion)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (created) => {
          this.snackBar.open('Neue Entwurfsversion erstellt.', 'OK', { duration: 3500, verticalPosition: 'top', panelClass: ['success-snackbar'] });
          this.router.navigateByUrl(`/workflow/publication_import/${created.id}/overview`);
        },
        error: () => {
          this.snackBar.open('Neue Entwurfsversion konnte nicht erstellt werden.', 'OK', {
            duration: 4500,
            verticalPosition: 'top',
            panelClass: ['danger-snackbar'],
          });
        },
      });
  }

  run(): void {
    if (!this.entity?.id || this.loading) return;

    this.loading = true;
    const reporting_year = this.form.controls.reporting_year.value;
    const dryRun = this.form.controls.dry_run.value
    const update = this.form.controls.update.value
    this.workflowService
      .run(this.entity.id, reporting_year, update, dryRun)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.snackBar.open(
            dryRun ? 'Dry-Run gestartet. Das Ergebnis wird im Report protokolliert.' : 'Importlauf gestartet.',
            'OK',
            { duration: 4500, verticalPosition: 'top', panelClass: ['success-snackbar'] },
          );
          this.update();
        },
        error: () => {
          this.snackBar.open('Der Workflow konnte nicht gestartet werden.', 'OK', {
            duration: 4500,
            verticalPosition: 'top',
            panelClass: ['danger-snackbar'],
          });
          this.update();
        },
      });
  }

  private persistChanges(patch: Partial<ImportWorkflow>, successMessage: string): void {
    if (!this.entity || !this.entity.id || this.loading) return;

    const updated: ImportWorkflow = { ...this.entity, ...patch };

    this.loading = true;
    this.workflowService
      .update(updated)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (saved) => {
          this.facade.patch(saved);
          this.snackBar.open(successMessage, 'OK', { duration: 3500, verticalPosition: 'top' });
        },
        error: () => {
          this.snackBar.open('Änderung konnte nicht gespeichert werden.', 'OK', {
            duration: 4500,
            verticalPosition: 'top',
            panelClass: ['danger-snackbar'],
          });
        },
      });
  }

  configureImport() {
    let dialogRef = this.dialog.open(ImportConfigComponent, {
      width: '800px',
      maxHeight: '800px',
      data: {
        workflow: this.entity
      }
    });
    dialogRef.afterClosed().subscribe(result => {

    });
  }
}
