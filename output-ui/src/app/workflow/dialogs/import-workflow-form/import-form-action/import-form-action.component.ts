import { ImportProgress, isImportStopping } from 'src/app/shared/import-progress';
import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { filter, finalize, firstValueFrom, Observable, Subject, takeUntil, tap, shareReplay } from 'rxjs';
import { ImportConfigComponent } from 'src/app/administration/components/import-config/import-config.component';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { SharedModule } from 'src/app/shared/shared.module';
import { WorkflowService } from 'src/app/workflow/workflow.service';
import {  ImportWorkflow, ImportStrategy  } from '@output/interfaces';
import { ImportFormFacade } from '../import-form-facade.service';

@Component({
  selector: 'app-import-form-action',
  standalone: true,
  imports: [SharedModule, MatProgressBarModule],
  templateUrl: './import-form-action.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './import-form-action.component.css',
})
export class ImportFormActionComponent implements OnInit, OnDestroy {
  entity: ImportWorkflow | null = null;
  loading = false;
  subject = new Subject<any>();
  ob$: Observable<ImportProgress>;
  stopping = false;
  private startPending = false;
  private seenActive = false;
  private stopWasRequested = false;
  private statusVersion = 0;
  private readonly destroy$ = new Subject<void>();
  isRunning = false;
  status: ImportProgress;
  file?: File;

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
    private dialog: MatDialog,
    private errorPresentation: ErrorPresentationService,
  ) { }

  async ngOnInit() {
    this.facade.import$.pipe(filter((e): e is ImportWorkflow => e != null), takeUntil(this.facade.destroy$), takeUntil(this.destroy$)).subscribe((workflow) => {
      if (this.entity?.id !== workflow.id) {
        this.subject.next('');
        this.ob$ = undefined;
        this.seenActive = false;
        this.stopping = false;
      }
      this.entity = workflow;
      if (this.entity.strategy_type === ImportStrategy.URL_DOI) {
        this.form.controls.update.setValue(true);
        this.form.controls.update.disable();
      }
      void this.update();
    });
  }

  ngOnDestroy(): void {
    this.statusVersion++;
    this.destroy$.next();
    this.destroy$.complete();
    this.subject.next('');
    this.subject.complete();
  }

  async update() {
    if (!this.entity?.id) return;
    const id = this.entity.id;
    const version = ++this.statusVersion;
    try {
      const status = await firstValueFrom(this.workflowService.getStatus(id).pipe(takeUntil(this.destroy$)));
      if (this.entity?.id !== id || version !== this.statusVersion || this.destroy$.isStopped) return;
      this.status = status;
      if (status.progress !== 0) {
        this.isRunning = true;
        this.seenActive = true;
        if (isImportStopping(status)) {
          this.stopping = true;
          this.stopWasRequested = true;
        }
        this.monitorRun();
      } else if (!this.startPending || this.seenActive) {
        this.finishMonitoring(status);
      }
    } catch (error) {
      if (!this.destroy$.isStopped) this.errorPresentation.present(error, { action: 'load', entity: 'Workflow-Status' });
    }
  }

  get canStop(): boolean {
    return this.seenActive || (!!this.status?.stale && !!this.status.reportId);
  }

  stop(): void {
    if (!this.entity?.id || !this.canStop || this.stopping) return;
    this.stopping = true;
    this.workflowService.stopImport(this.entity.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: result => {
        if (result.state === 'stopping') {
          this.stopWasRequested = true;
          this.snackBar.open('Stopp angefordert. Begonnene Datensätze werden noch abgeschlossen.', 'OK', { duration: 4500 });
        }
        void this.update();
      },
      error: error => {
        this.stopping = false;
        this.errorPresentation.present(error, { action: 'run', entity: 'Workflow', fallbackMessage: 'Workflow konnte nicht gestoppt werden.' });
      },
    });
  }

  private monitorRun(): void {
    if (this.ob$ || !this.entity?.id) return;
    this.form.disable();
    const progress = this.workflowService.getProgress(this.entity.id).pipe(
      takeUntil(this.subject),
      takeUntil(this.destroy$),
      tap(status => {
        this.statusVersion++;
        this.status = status;
        if (status.progress !== 0) {
          this.seenActive = true;
          this.isRunning = true;
          if (isImportStopping(status)) {
            this.stopping = true;
            this.stopWasRequested = true;
          }
        } else if (!this.startPending || this.seenActive) {
          this.finishMonitoring(status);
        }
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.ob$ = progress;
    progress.subscribe({
      error: error => this.errorPresentation.present(error, { action: 'load', entity: 'Workflow-Status' }),
    });
  }

  private finishMonitoring(status: ImportProgress): void {
    this.status = status;
    this.isRunning = false;
    this.seenActive = false;
    this.stopping = false;
    this.ob$ = undefined;
    this.subject.next('');
    this.form.enable();
    if (this.entity?.strategy_type === ImportStrategy.URL_DOI) this.form.controls.update.disable();
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

  get fileStrategy(): boolean {
    return !!this.entity && this.entity.strategy_type === ImportStrategy.FILE_UPLOAD;
  }

  publish(): void {
    if (!this.entity || !this.entity.id || this.loading) return;
    this.persistChanges({ published_at: new Date(), deleted_at: null, locked_at: null }, 'Workflow veröffentlicht.');
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
        error: (error) => {
          this.errorPresentation.present(error, { action: 'delete', entity: 'Workflow' });
        },
      });
  }

  duplicate(): void {
    if (!this.entity || this.loading) return;

    const nextVersion: ImportWorkflow = {
      ...this.entity,
      id: undefined,
      workflow_id: this.entity.workflow_id,
      version: undefined,
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
        error: (error) => {
          this.errorPresentation.present(error, { action: 'create', entity: 'Workflow' });
        },
      });
  }

  run(): void {
    if (!this.entity?.id || this.loading || this.isRunning) return;

    this.loading = true;
    this.isRunning = true;
    this.startPending = true;
    this.seenActive = false;
    this.stopWasRequested = false;
    this.form.disable();
    this.monitorRun();

    const reporting_year = this.form.controls.reporting_year.value;
    const dryRun = this.form.controls.dry_run.value;
    let update = this.form.controls.update.value;
    if (!update) update = false;
    this.workflowService
      .run(this.entity.id, reporting_year, update, dryRun, this.file)
      .pipe(finalize(() => { this.loading = false; this.startPending = false; }), takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.startPending = false;
          if (!this.stopWasRequested) this.snackBar.open(
            dryRun ? 'Dry-Run gestartet. Das Ergebnis wird im Report protokolliert.' : 'Workflow gestartet.',
            'OK',
            { duration: 4500, verticalPosition: 'top', panelClass: ['success-snackbar'] },
          );
          void this.update();
        },
        error: (error) => {
          this.startPending = false;
          this.errorPresentation.applyFieldErrors(this.form, error);
          this.errorPresentation.present(error, { action: 'run', entity: 'Workflow' });
          void this.update();
        },
      });
  }

  setFile(event: Event) {
    const target = event.target as HTMLInputElement | null;
    this.file = target?.files?.[0];
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
          this.snackBar.open(successMessage, 'OK', { duration: 3500, verticalPosition: 'top', panelClass: ['success-snackbar'] });
        },
        error: (error) => {
          this.errorPresentation.present(error, { action: 'save', entity: 'Workflow' });
        },
      });
  }

  configureImport() {
    const dialogRef = this.dialog.open(ImportConfigComponent, {
      width: '800px',
      maxHeight: '800px',
      data: {
        workflow: this.entity
      }
    });
    dialogRef.afterClosed().subscribe();
  }
}
