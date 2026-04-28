import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, finalize, firstValueFrom, map, Observable, Subject, takeUntil } from 'rxjs';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { FilterViewComponent } from 'src/app/publications/dialogs/filter-view/filter-view.component';
import { selectViewConfig } from 'src/app/services/redux';
import { SharedModule } from 'src/app/shared/shared.module';
import { ExportWorkflowService } from 'src/app/workflow/export-workflow.service';
import { SearchFilter } from '../../../../../../../output-interfaces/Config';
import { ExportWorkflow } from '../../../../../../../output-interfaces/Workflow';
import { ExportFormFacade } from '../export-form-facade.service';

type InlinePreviewKind = 'json' | 'xml' | 'csv' | 'text';
type ExportPublicationFilter = { filter: SearchFilter, paths: string[] };

@Component({
  selector: 'app-export-form-action',
  imports: [SharedModule, MatProgressBarModule],
  templateUrl: './export-form-action.component.html',
  styleUrl: './export-form-action.component.css',
})
export class ExportFormActionComponent implements OnInit {
  entity: ExportWorkflow | null = null;
  loading = false;
  subject = new Subject<any>();
  ob$: Observable<{ progress: number, status: string }>;
  isRunning = false;
  status: { progress: number, status: string };
  latestResultBlob: Blob | null = null;
  latestResultFilename: string | null = null;
  inlineResult: string | null = null;
  inlineResultKind: InlinePreviewKind | null = null;
  publicationFilter: ExportPublicationFilter = this.emptyPublicationFilter();
  publicationPageFilter: ExportPublicationFilter = this.emptyPublicationFilter();
  private filterInitialized = false;

  form: FormGroup = this.formBuilder.group({
    withMasterData: [false],
  });

  constructor(
    private facade: ExportFormFacade,
    private exportWorkflowService: ExportWorkflowService,
    private snackBar: MatSnackBar,
    private router: Router,
    private dialog: MatDialog,
    private store: Store,
    private formBuilder: FormBuilder,
    private errorPresentation: ErrorPresentationService,
  ) { }

  async ngOnInit() {
    this.facade.export$.pipe(filter((e): e is ExportWorkflow => e != null), takeUntil(this.facade.destroy$)).subscribe((workflow) => {
      this.entity = workflow;
      void this.update();
    });

    this.store.select(selectViewConfig)
      .pipe(takeUntil(this.facade.destroy$))
      .subscribe((viewConfig) => {
        this.publicationPageFilter = this.normalizePublicationFilter(viewConfig?.filter);
        if (!this.filterInitialized) {
          this.publicationFilter = this.clonePublicationFilter(this.publicationPageFilter);
          this.filterInitialized = true;
        }
      });
  }

  async update() {
    if (!this.entity) return;
    this.isRunning = await this.exportWorkflowService.isRunning(this.entity.id!);
    if (this.isRunning) {
      this.form.disable();
      this.ob$ = this.exportWorkflowService.getProgress(this.entity.id!).pipe(takeUntil(this.subject), map(data => {
        if (data.progress === 0 || data.progress >= 1) {
          this.isRunning = false;
          this.ob$ = undefined as never;
          this.form.enable();
          this.subject.next('');
        }
        return data;
      }));
    } else {
      this.status = await firstValueFrom(this.exportWorkflowService.getStatus(this.entity.id!));
      this.form.enable();
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

  get hasPublicationFilter(): boolean {
    return this.hasFilter(this.publicationFilter);
  }

  get hasPublicationPageFilter(): boolean {
    return this.hasFilter(this.publicationPageFilter);
  }

  get publicationFilterSummary(): string {
    const expressionCount = this.publicationFilter.filter?.expressions?.length ?? 0;
    const pathCount = this.publicationFilter.paths?.length ?? 0;
    if (expressionCount === 0 && pathCount === 0) return 'Kein Publikationsfilter aktiv';

    const parts = [];
    if (expressionCount > 0) parts.push(`${expressionCount} Feldfilter`);
    if (pathCount > 0) parts.push(`${pathCount} Filteransicht${pathCount === 1 ? '' : 'en'}`);
    return parts.join(', ');
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
    this.exportWorkflowService
      .delete([this.entity.id])
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: () => {
          this.snackBar.open('Entwurf wurde gelöscht.', 'OK', { duration: 3500, verticalPosition: 'top' });
          this.router.navigateByUrl('/workflow/publication_export');
        },
        error: (error) => {
          this.errorPresentation.present(error, { action: 'delete', entity: 'Workflow' });
        },
      });
  }

  duplicate(): void {
    if (!this.entity || this.loading) return;

    const nextVersion: ExportWorkflow = {
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
    this.exportWorkflowService
      .add(nextVersion)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (created) => {
          this.snackBar.open('Neue Entwurfsversion erstellt.', 'OK', { duration: 3500, verticalPosition: 'top', panelClass: ['success-snackbar'] });
          this.router.navigateByUrl(`/workflow/publication_export/${created.id}/overview`);
        },
        error: (error) => {
          this.errorPresentation.present(error, { action: 'create', entity: 'Workflow' });
        },
      });
  }

  editPublicationFilter(): void {
    const dialogRef = this.dialog.open(FilterViewComponent, {
      width: '800px',
      maxHeight: '800px',
      disableClose: false,
      data: {
        viewConfig: {
          filter: this.clonePublicationFilter(this.publicationFilter),
        },
      },
    });

    dialogRef.afterClosed().subscribe((result: ExportPublicationFilter | null) => {
      if (!result) return;
      this.publicationFilter = this.normalizePublicationFilter(result);
    });
  }

  usePublicationPageFilter(): void {
    this.publicationFilter = this.clonePublicationFilter(this.publicationPageFilter);
  }

  resetPublicationFilter(): void {
    this.publicationFilter = this.emptyPublicationFilter();
  }

  run(): void {
    if (!this.entity?.id || this.loading) return;

    this.loading = true;
    this.form.disable();

    const withMasterData = !!this.form.controls.withMasterData.value;
    const publicationFilter = this.hasPublicationFilter
      ? this.clonePublicationFilter(this.publicationFilter)
      : undefined;
    this.exportWorkflowService
      .run(this.entity.id, publicationFilter, withMasterData)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (resp) => {
          void this.handleRunResponse(
            resp.body!,
            resp.headers.get('content-disposition') || resp.headers.get('Content-Disposition'),
            resp.headers.get('content-type') || resp.headers.get('Content-Type')
          );
          this.snackBar.open('Export erfolgreich erstellt.', 'OK', {
            duration: 4500,
            verticalPosition: 'top',
            panelClass: ['success-snackbar'],
          });
          void this.update();
        },
        error: (error) => {
          this.errorPresentation.present(error, { action: 'run', entity: 'Workflow' });
          void this.update();
        },
      });
  }

  downloadLatestResult(): void {
    if (!this.latestResultBlob) return;
    const filename = this.latestResultFilename ?? `export-${this.entity?.id ?? 'workflow'}`;
    this.triggerDownload(this.latestResultBlob, filename);
  }

  private persistChanges(patch: Partial<ExportWorkflow>, successMessage: string): void {
    if (!this.entity || !this.entity.id || this.loading) return;

    const updated: ExportWorkflow = { ...this.entity, ...patch };

    this.loading = true;
    this.exportWorkflowService
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

  private async handleRunResponse(blob: Blob, contentDisposition: string | null, contentTypeHeader: string | null): Promise<void> {
    const filename = this.getFilenameFromContentDisposition(contentDisposition) ?? `export-${this.entity?.id ?? 'workflow'}`;
    const disposition = this.getDispositionFromContentDisposition(contentDisposition);
    const contentType = (contentTypeHeader || blob.type || '').toLowerCase();
    const previewKind = this.getInlinePreviewKind(contentType, filename);

    this.latestResultBlob = blob;
    this.latestResultFilename = filename;

    if (disposition !== 'attachment' && previewKind) {
      const text = await blob.text();
      this.inlineResult = this.formatInlineResult(previewKind, text);
      this.inlineResultKind = previewKind;
      return;
    }

    this.inlineResult = null;
    this.inlineResultKind = null;
    this.triggerDownload(blob, filename);
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  }

  private getFilenameFromContentDisposition(cd: string | null): string | null {
    if (!cd) return null;

    const mStar = cd.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
    if (mStar?.[1]) return decodeURIComponent(mStar[1].trim().replace(/(^"|"$)/g, ''));

    const m = cd.match(/filename\s*=\s*("?)([^";]+)\1/i);
    return m?.[2]?.trim() ?? null;
  }

  private getDispositionFromContentDisposition(cd: string | null): 'inline' | 'attachment' | null {
    if (!cd) return null;
    if (/\battachment\b/i.test(cd)) return 'attachment';
    if (/\binline\b/i.test(cd)) return 'inline';
    return null;
  }

  private getInlinePreviewKind(contentType: string, filename: string): InlinePreviewKind | null {
    const lowerFilename = filename.toLowerCase();
    if (contentType.includes('json') || lowerFilename.endsWith('.json')) return 'json';
    if (contentType.includes('xml') || lowerFilename.endsWith('.xml')) return 'xml';
    if (contentType.includes('csv') || lowerFilename.endsWith('.csv')) return 'csv';
    if (contentType.startsWith('text/')) return 'text';
    return null;
  }

  private formatInlineResult(kind: InlinePreviewKind, value: string): string {
    if (kind === 'json') {
      try {
        return JSON.stringify(JSON.parse(value), null, 2);
      } catch {
        return value;
      }
    }
    return value;
  }

  private emptyPublicationFilter(): ExportPublicationFilter {
    return {
      filter: { expressions: [] },
      paths: [],
    };
  }

  private normalizePublicationFilter(value?: { filter?: SearchFilter, paths?: string[] } | null): ExportPublicationFilter {
    return {
      filter: {
        expressions: (value?.filter?.expressions ?? []).map((expression) => ({ ...expression })),
      },
      paths: [...(value?.paths ?? [])],
    };
  }

  private clonePublicationFilter(value: ExportPublicationFilter): ExportPublicationFilter {
    return this.normalizePublicationFilter(value);
  }

  private hasFilter(value: ExportPublicationFilter): boolean {
    return (value.filter?.expressions?.length ?? 0) > 0 || (value.paths?.length ?? 0) > 0;
  }
}
