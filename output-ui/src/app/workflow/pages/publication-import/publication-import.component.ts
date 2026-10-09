import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { TableButton, TableHeader, TableParent, TableRowAction } from 'src/app/table/table.interface';
import {  ImportStrategy, ImportWorkflow  } from '@output/interfaces';
import { WorkflowService } from '../../workflow.service';
import { ImportWorkflowFormComponent } from '../../dialogs/import-workflow-form/import-workflow-form.component';
import { TableComponent } from 'src/app/table/table-component/table.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { ConfigService } from 'src/app/administration/services/config.service';
import {
  EMPTY, Observable, Subject, catchError, filter, finalize, firstValueFrom,
  forkJoin, map, of, switchMap, take, takeUntil, tap
} from 'rxjs';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';

@Component({
  selector: 'app-publication-import',
  templateUrl: './publication-import.component.html',
  styleUrl: './publication-import.component.css',
  standalone: false
})
export class PublicationImportComponent implements TableParent<ImportWorkflow>, OnInit, OnDestroy {
  formComponent = ImportWorkflowFormComponent;
  buttons: TableButton[] = [
    { title: 'Import aus Datei hinzufügen', action_function: this.import.bind(this) }
  ];
  not_selectable?: boolean = true;

  common_headers: TableHeader[] = [
    { colName: 'id', colTitle: 'ID', type: 'number' },
    { colName: 'label', colTitle: 'Bezeichnung' },
    { colName: 'version', colTitle: 'Version', type: 'number' },
  ]

  draft_headers: TableHeader[] = [
    { colName: 'modified_at', colTitle: 'Zuletzt geändert', type: 'datetime' },
  ]

  published_headers: TableHeader[] = [
    { colName: 'last_run_status', colTitle: 'Letzter Lauf Status' },
    { colName: 'last_run_finished_at', colTitle: 'Letzter Lauf beendet', type: 'datetime' },
    { colName: 'last_run_log_link', colTitle: 'Letzter Lauf Log', type: 'route-link' },
    { colName: 'published_at', colTitle: 'Veröffentlicht', type: 'datetime' },
  ]

  archived_headers: TableHeader[] = [
    { colName: 'deleted_at', colTitle: 'Archiviert', type: 'datetime' },
  ]

  headers: TableHeader[] = this.common_headers.concat(this.published_headers);

  indexOptions = {
    type: 'published'
  };

  rowActions: TableRowAction<ImportWorkflow>[] = [{
    icon: 'play_arrow',
    tooltip: (workflow) => workflow.strategy_type === ImportStrategy.FILE_UPLOAD
      ? 'Datei auswählen und Workflow sofort starten'
      : 'Workflow mit dem aktuellen Reporting Year sofort starten',
    action: (workflow) => this.quickStart(workflow),
    visible: () => this.indexOptions.type === 'published',
    disabled: (workflow) => !workflow.id
      || this.runningWorkflowIds.has(workflow.id)
      || !this.availableWorkflowIds.has(workflow.id),
  }];

  @ViewChild(TableComponent) table: TableComponent<ImportWorkflow, ImportWorkflow>;
  @ViewChild('fileInput') fileInput: ElementRef<HTMLInputElement>;
  @ViewChild('quickStartFileInput') quickStartFileInput: ElementRef<HTMLInputElement>;

  private readonly runningWorkflowIds = new Set<number>();
  private readonly availableWorkflowIds = new Set<number>();
  private readonly monitoredWorkflowIds = new Set<number>();
  private readonly destroy$ = new Subject<void>();
  private pendingFileWorkflow?: ImportWorkflow;
  private destroyed = false;

  constructor(public workflowService: WorkflowService, private _snackBar: MatSnackBar, private router: Router, private configService: ConfigService,
    private errorPresentation: ErrorPresentationService) { }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.destroy$.next();
    this.destroy$.complete();
  }

  afterDataLoaded(workflows: ImportWorkflow[]): Observable<void> {
    if (this.indexOptions.type !== 'published') return of(undefined);

    const workflowIds = workflows.flatMap(workflow => workflow.id ? [workflow.id] : []);
    this.availableWorkflowIds.clear();
    if (!workflowIds.length) return of(undefined);

    return forkJoin(workflowIds.map(workflowId => this.workflowService.getStatus(workflowId).pipe(
      map(status => ({ workflowId, status })),
      catchError(error => {
        this.errorPresentation.present(error, { action: 'load', entity: 'Workflow-Status' });
        return of({ workflowId, status: undefined });
      })
    ))).pipe(
      tap(results => results.forEach(({ workflowId, status }) => {
        if (!status) return;
        if (status.progress === 0) {
          if (!this.monitoredWorkflowIds.has(workflowId)) {
            this.runningWorkflowIds.delete(workflowId);
            this.availableWorkflowIds.add(workflowId);
          }
          return;
        }

        this.runningWorkflowIds.add(workflowId);
        this.availableWorkflowIds.delete(workflowId);
        this.monitorWorkflow(workflowId);
      })),
      map(() => undefined)
    );
  }

  getName() {
    let res = 'Import-Workflows';
    if (this.indexOptions.type === 'draft') res += ' (Entwürfe)';
    else if (this.indexOptions.type === 'published') res += ' (Aktiv)';
    else if (this.indexOptions.type === 'archived') res += ' (Archiviert)';
    return res;
  }

  async edit(workflow: ImportWorkflow) {
    if (await firstValueFrom(this.workflowService.isLocked(workflow.id))) {
      this._snackBar.open('Workflow wird gerade bearbeitet, bitte warten.', 'Na gut...', {
        duration: 5000,
        panelClass: ['danger-snackbar'],
        verticalPosition: 'top'
      });
      return;
    }
    if (this.indexOptions.type === 'published') this.router.navigate(['/workflow/publication_import/' + workflow.id + '/action']);
    else this.router.navigate(['/workflow/publication_import/' + workflow.id + '/general']);
  }

  add() {
    this.router.navigate(['/workflow/publication_import/new/overview']);
  }

  getLink() {
    return '/workflow/publication_import';
  }

  getLabel() {
    return '/Workflows/Publikationsimport';
  }

  change(event: any) {
    this.indexOptions = {
      type: event.value
    };
    switch (event.value) {
      case 'draft':
        this.headers = this.common_headers.concat(this.draft_headers);
        break;
      case 'published':
        this.headers = this.common_headers.concat(this.published_headers);
        break;
      case 'archived':
        this.headers = this.common_headers.concat(this.archived_headers);
        break;
    }

    this.table.updateData().subscribe();
  }

  import() {
    this.fileInput?.nativeElement.click();
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      this._snackBar.open('Bitte eine JSON-Datei auswählen.', 'Nagut...', {
        duration: 5000,
        panelClass: ['danger-snackbar'],
        verticalPosition: 'top'
      });
      return;
    }
    this.workflowService.importWorkflow(file).subscribe({
      next: () => {
        this._snackBar.open('Import-Workflow wurde hinzugefügt.', 'Super!', {
          duration: 5000,
          panelClass: ['success-snackbar'],
          verticalPosition: 'top'
        });
        this.table.updateData().subscribe();
      },
      error: (error) => {
        this.errorPresentation.present(error, { action: 'create', entity: 'Import-Workflow' });
      }
    });
  }

  quickStart(workflow: ImportWorkflow): void {
    if (!workflow.id || this.indexOptions.type !== 'published' || this.runningWorkflowIds.has(workflow.id)) return;

    if (workflow.strategy_type === ImportStrategy.FILE_UPLOAD) {
      this.pendingFileWorkflow = workflow;
      this.quickStartFileInput?.nativeElement.click();
      return;
    }

    this.startWorkflow(workflow);
  }

  onQuickStartFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const workflow = this.pendingFileWorkflow;
    input.value = '';
    this.pendingFileWorkflow = undefined;

    if (!file || !workflow) return;
    if (!/\.(csv|xlsx)$/i.test(file.name)) {
      this._snackBar.open('Bitte eine CSV- oder XLSX-Datei auswählen.', 'OK', {
        duration: 5000,
        panelClass: ['danger-snackbar'],
        verticalPosition: 'top'
      });
      return;
    }

    this.startWorkflow(workflow, file);
  }

  isQuickStartRunning(workflowId: number): boolean {
    return this.runningWorkflowIds.has(workflowId);
  }

  private startWorkflow(workflow: ImportWorkflow, file?: File): void {
    const workflowId = workflow.id;
    if (!workflowId || this.runningWorkflowIds.has(workflowId)) return;

    this.runningWorkflowIds.add(workflowId);
    this.availableWorkflowIds.delete(workflowId);
    let started = false;

    this.configService.get('reporting_year').pipe(
      map((config) => Number(config?.value)),
      switchMap((reportingYear) => {
        if (!Number.isInteger(reportingYear) || reportingYear < 1850) {
          this._snackBar.open('Quick-Start nicht möglich: Es ist kein gültiges Reporting Year konfiguriert.', 'OK', {
            duration: 5000,
            panelClass: ['danger-snackbar'],
            verticalPosition: 'top'
          });
          return EMPTY;
        }
        return this.workflowService.run(workflowId, reportingYear, true, false, file);
      }),
      finalize(() => {
        if (!started) {
          this.runningWorkflowIds.delete(workflowId);
          this.availableWorkflowIds.add(workflowId);
        }
      }),
      takeUntil(this.destroy$),
    ).subscribe({
      next: () => {
        started = true;
        this._snackBar.open(`Workflow „${workflow.label ?? workflowId}“ wurde gestartet.`, 'OK', {
          duration: 4500,
          verticalPosition: 'top',
          panelClass: ['success-snackbar']
        });
        this.refreshTable();
        this.monitorWorkflow(workflowId);
      },
      error: (error) => {
        this.errorPresentation.present(error, { action: 'run', entity: 'Import-Workflow' });
      }
    });
  }

  private monitorWorkflow(workflowId: number): void {
    if (this.monitoredWorkflowIds.has(workflowId)) return;
    this.monitoredWorkflowIds.add(workflowId);
    let completed = false;

    this.workflowService.getProgress(workflowId).pipe(
      filter((status) => status.progress === 0),
      take(1),
      finalize(() => {
        this.monitoredWorkflowIds.delete(workflowId);
        this.runningWorkflowIds.delete(workflowId);
        if (completed) this.availableWorkflowIds.add(workflowId);
        if (!this.destroyed) this.refreshTable();
      }),
      takeUntil(this.destroy$),
    ).subscribe({
      next: () => {
        completed = true;
      },
      error: (error) => {
        this.errorPresentation.present(error, { action: 'load', entity: 'Workflow-Status' });
      }
    });
  }

  private refreshTable(): void {
    this.table?.updateData().subscribe({
      error: (error) => this.errorPresentation.present(error, { action: 'load', entity: 'Import-Workflows' })
    });
  }
}
