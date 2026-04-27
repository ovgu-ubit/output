import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { filter, finalize, firstValueFrom, map, Observable, Subject, takeUntil } from 'rxjs';
import { ImportConfigComponent } from 'src/app/administration/components/import-config/import-config.component';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { SharedModule } from 'src/app/shared/shared.module';
import { WorkflowService } from 'src/app/workflow/workflow.service';
import { ImportWorkflow, ImportStrategy } from '../../../../../../../output-interfaces/Workflow';
import { ImportFormFacade } from '../import-form-facade.service';

@Component({
  selector: 'app-import-form-action',
  standalone: true,
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
    this.facade.import$.pipe(filter((e): e is ImportWorkflow => e != null), takeUntil(this.facade.destroy$)).subscribe((workflow) => {
      this.entity = workflow;
      if (this.entity.strategy_type === ImportStrategy.URL_DOI) {
        this.form.controls.update.setValue(true);
        this.form.controls.update.disable();
      }
      void this.update();
    });
  }

  async update() {
    if (!this.entity) return;
    this.isRunning = await this.workflowService.isRunning(this.entity.id);
    if (this.isRunning) {
      this.form.disable();
      this.ob$ = this.workflowService.getProgress(this.entity.id).pipe(takeUntil(this.subject), map(data => {
        if (data.progress === 0 || data.progress >= 1) {
          this.isRunning = false;
          this.ob$ = undefined as never;
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
    if (!this.entity?.id || this.loading) return;

    this.loading = true;
    this.form.disable();

    const reporting_year = this.form.controls.reporting_year.value;
    const dryRun = this.form.controls.dry_run.value;
    let update = this.form.controls.update.value;
    if (!update) update = false;
    this.workflowService
      .run(this.entity.id, reporting_year, update, dryRun, this.file)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.snackBar.open(
            dryRun ? 'Dry-Run gestartet. Das Ergebnis wird im Report protokolliert.' : 'Workflow gestartet.',
            'OK',
            { duration: 4500, verticalPosition: 'top', panelClass: ['success-snackbar'] },
          );
          void this.update();
        },
        error: (error) => {
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
