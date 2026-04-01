import { Component, OnInit } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { filter, finalize, firstValueFrom, map, Observable, Subject, takeUntil } from 'rxjs';
import { SharedModule } from 'src/app/shared/shared.module';
import { ValidationWorkflow } from '../../../../../../../output-interfaces/Workflow';
import { ValidationWorkflowService } from 'src/app/workflow/validation-workflow.service';
import { ValidationFormFacade } from '../validation-form-facade.service';

@Component({
  selector: 'app-validation-form-action',
  imports: [SharedModule, MatProgressBarModule],
  templateUrl: './validation-form-action.component.html',
  styleUrl: './validation-form-action.component.css',
})
export class ValidationFormActionComponent implements OnInit {
  entity: ValidationWorkflow | null = null;
  loading = false;
  subject = new Subject<any>();
  ob$: Observable<{ progress: number, status: string }>;
  isRunning = false;
  status: { progress: number, status: string };

  constructor(
    private facade: ValidationFormFacade,
    private validationWorkflowService: ValidationWorkflowService,
    private snackBar: MatSnackBar,
    private router: Router,
  ) { }

  async ngOnInit() {
    this.facade.validation$.pipe(filter((e): e is ValidationWorkflow => e != null), takeUntil(this.facade.destroy$)).subscribe((workflow) => {
      this.entity = workflow;
      void this.update();
    });
  }

  async update() {
    if (!this.entity?.id) return;
    this.isRunning = await this.validationWorkflowService.isRunning(this.entity.id);
    if (this.isRunning) {
      this.ob$ = this.validationWorkflowService.getProgress(this.entity.id).pipe(takeUntil(this.subject), map(data => {
        if (data.progress === 0 || data.progress >= 1) {
          this.isRunning = false;
          this.ob$ = undefined as never;
          this.subject.next('');
        }
        return data;
      }));
    } else {
      this.status = await firstValueFrom(this.validationWorkflowService.getStatus(this.entity.id));
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
    this.persistChanges({ published_at: new Date(), deleted_at: null, locked_at: null }, 'Workflow veroeffentlicht.');
  }

  archive(): void {
    if (!this.entity || !this.entity.id || this.loading) return;
    this.persistChanges({ deleted_at: new Date() }, 'Workflow archiviert.');
  }

  deleteDraft(): void {
    if (!this.entity?.id || this.loading) return;
    if (!window.confirm('Moechten Sie diesen Entwurf wirklich loeschen?')) return;

    this.loading = true;
    this.validationWorkflowService
      .delete([this.entity.id])
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.snackBar.open('Entwurf wurde geloescht.', 'OK', { duration: 3500, verticalPosition: 'top' });
          this.router.navigateByUrl('/workflow/publication_validation');
        },
        error: () => {
          this.snackBar.open('Der Entwurf konnte nicht geloescht werden.', 'OK', {
            duration: 4500,
            verticalPosition: 'top',
            panelClass: ['danger-snackbar'],
          });
        },
      });
  }

  duplicate(): void {
    if (!this.entity || this.loading) return;

    const nextVersion: ValidationWorkflow = {
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
    this.validationWorkflowService
      .add(nextVersion)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (created) => {
          this.snackBar.open('Neue Entwurfsversion erstellt.', 'OK', { duration: 3500, verticalPosition: 'top', panelClass: ['success-snackbar'] });
          this.router.navigateByUrl(`/workflow/publication_validation/${created.id}/overview`);
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

    this.validationWorkflowService
      .run(this.entity.id)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.snackBar.open('Validierung gestartet. Findings werden in Workflow-Reports protokolliert.', 'OK', {
            duration: 4500,
            verticalPosition: 'top',
            panelClass: ['success-snackbar'],
          });
          void this.update();
        },
        error: () => {
          this.snackBar.open('Die Validierung konnte nicht gestartet werden.', 'OK', {
            duration: 4500,
            verticalPosition: 'top',
            panelClass: ['danger-snackbar'],
          });
          void this.update();
        },
      });
  }

  private persistChanges(patch: Partial<ValidationWorkflow>, successMessage: string): void {
    if (!this.entity || !this.entity.id || this.loading) return;

    const updated: ValidationWorkflow = { ...this.entity, ...patch };

    this.loading = true;
    this.validationWorkflowService
      .update(updated)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (saved) => {
          this.facade.patch(saved);
          this.snackBar.open(successMessage, 'OK', { duration: 3500, verticalPosition: 'top', panelClass: ['success-snackbar'] });
        },
        error: () => {
          this.snackBar.open('Aenderung konnte nicht gespeichert werden.', 'OK', {
            duration: 4500,
            verticalPosition: 'top',
            panelClass: ['danger-snackbar'],
          });
        },
      });
  }
}
