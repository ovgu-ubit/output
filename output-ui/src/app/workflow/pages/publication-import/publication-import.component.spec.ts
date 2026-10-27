import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublicationImportComponent } from './publication-import.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { TableModule } from 'src/app/table/table.module';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { ConfigService } from 'src/app/administration/services/config.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WorkflowService } from '../../workflow.service';
import { ImportStrategy, ImportWorkflow } from '@output/interfaces';
import { Subject, of, throwError } from 'rxjs';

describe('PublicationImportComponent', () => {
  let component: PublicationImportComponent;
  let fixture: ComponentFixture<PublicationImportComponent>;
  let workflowService: jasmine.SpyObj<WorkflowService>;
  let configService: jasmine.SpyObj<ConfigService>;
  let snackBar: jasmine.SpyObj<MatSnackBar>;
  let errorPresentation: jasmine.SpyObj<ErrorPresentationService>;

  beforeEach(async () => {
    workflowService = jasmine.createSpyObj<WorkflowService>('WorkflowService', [
      'index', 'isLocked', 'importWorkflow', 'run', 'getProgress', 'getStatus', 'stopImport'
    ]);
    workflowService.index.and.returnValue(of([]));
    workflowService.isLocked.and.returnValue(of(false));
    workflowService.importWorkflow.and.returnValue(of({} as ImportWorkflow));
    workflowService.run.and.returnValue(of({ status: 'started', dry_run: false }));
    workflowService.getProgress.and.returnValue(of({ progress: 0, status: 'finished' }));
    workflowService.getStatus.and.returnValue(of({ progress: 0, status: 'finished' }));
    workflowService.stopImport.and.returnValue(of({ state: 'stopping', runId: 'run-1' }));
    configService = jasmine.createSpyObj<ConfigService>('ConfigService', ['get']);
    configService.get.and.returnValue(of({ value: 2026 } as any));
    snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    errorPresentation = jasmine.createSpyObj<ErrorPresentationService>('ErrorPresentationService', ['present']);

    await TestBed.configureTestingModule({
      imports: [SharedModule, TableModule, NoopAnimationsModule],
      declarations: [ PublicationImportComponent ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideStore({}),
        { provide: WorkflowService, useValue: workflowService },
        { provide: ConfigService, useValue: configService },
        { provide: MatSnackBar, useValue: snackBar },
        { provide: ErrorPresentationService, useValue: errorPresentation },
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PublicationImportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('quick-starts an active URL workflow with the configured reporting year', () => {
    const workflow: ImportWorkflow = {
      id: 7,
      label: 'Crossref',
      strategy_type: ImportStrategy.URL_QUERY_OFFSET,
      published_at: new Date(),
    };
    spyOn(component.table, 'updateData').and.returnValue(of(undefined));

    component.quickStart(workflow);

    expect(configService.get).toHaveBeenCalledWith('reporting_year');
    expect(workflowService.run).toHaveBeenCalledWith(7, 2026, true, false, undefined);
    expect(workflowService.getProgress).toHaveBeenCalledWith(7);
    expect(component.table.updateData).toHaveBeenCalledTimes(2);
    expect(snackBar.open).toHaveBeenCalledWith(
      'Workflow „Crossref“ wurde gestartet.',
      'OK',
      jasmine.objectContaining({ panelClass: ['success-snackbar'] })
    );
    expect(component.isQuickStartRunning(7)).toBeFalse();
  });

  it('shows quick-start actions only in the active workflow view', () => {
    const workflow = { id: 7 } as ImportWorkflow;

    component.indexOptions.type = 'published';
    expect(component.rowActions[0].visible?.(workflow)).toBeTrue();

    component.indexOptions.type = 'draft';
    expect(component.rowActions[0].visible?.(workflow)).toBeFalse();
  });

  it('keeps quick-start disabled after reload while a workflow is running', () => {
    const workflow = { id: 12, strategy_type: ImportStrategy.URL_DOI } as ImportWorkflow;
    const progress = new Subject<{ progress: number; status: string }>();
    workflowService.getStatus.and.returnValue(of({ progress: 25, status: 'running' }));
    workflowService.getProgress.and.returnValue(progress);
    spyOn(component.table, 'updateData').and.returnValue(of(undefined));

    component.afterDataLoaded([workflow]).subscribe();

    expect(workflowService.getStatus).toHaveBeenCalledWith(12);
    expect(component.rowActions[0].disabled?.(workflow)).toBeTrue();

    progress.next({ progress: 0, status: 'finished' });
    progress.complete();

    expect(component.rowActions[0].disabled?.(workflow)).toBeFalse();
  });

  it('enables quick-start after reload when a workflow is not running', () => {
    const workflow = { id: 13, strategy_type: ImportStrategy.URL_DOI } as ImportWorkflow;

    component.afterDataLoaded([workflow]).subscribe();

    expect(component.rowActions[0].disabled?.(workflow)).toBeFalse();
  });

  it('opens the file picker before quick-starting a file workflow', () => {
    const workflow: ImportWorkflow = {
      id: 8,
      strategy_type: ImportStrategy.FILE_UPLOAD,
      published_at: new Date(),
    };
    spyOn(component.quickStartFileInput.nativeElement, 'click');

    component.quickStart(workflow);

    expect(component.quickStartFileInput.nativeElement.click).toHaveBeenCalled();
    expect(workflowService.run).not.toHaveBeenCalled();
  });

  it('starts a file workflow after a CSV or XLSX file was selected', () => {
    const workflow: ImportWorkflow = {
      id: 8,
      label: 'File import',
      strategy_type: ImportStrategy.FILE_UPLOAD,
      published_at: new Date(),
    };
    const file = new File(['title'], 'publications.csv', { type: 'text/csv' });
    const input = { files: [file], value: 'selected' } as unknown as HTMLInputElement;
    configService.get.calls.reset();
    configService.get.and.returnValue(of({ value: null } as any));
    spyOn(component.quickStartFileInput.nativeElement, 'click');
    spyOn(component.table, 'updateData').and.returnValue(of(undefined));

    component.quickStart(workflow);
    component.onQuickStartFileSelected({ target: input } as unknown as Event);

    expect(input.value).toBe('');
    expect(configService.get).not.toHaveBeenCalled();
    expect(workflowService.run).toHaveBeenCalledWith(8, undefined, true, false, file);
  });

  it('does not start after an invalid or cancelled file selection', () => {
    const workflow: ImportWorkflow = {
      id: 8,
      strategy_type: ImportStrategy.FILE_UPLOAD,
      published_at: new Date(),
    };
    const invalidFile = new File(['data'], 'publications.json', { type: 'application/json' });
    spyOn(component.quickStartFileInput.nativeElement, 'click');

    component.quickStart(workflow);
    component.onQuickStartFileSelected({ target: { files: [], value: 'selected' } } as unknown as Event);
    component.quickStart(workflow);
    component.onQuickStartFileSelected({ target: { files: [invalidFile], value: 'selected' } } as unknown as Event);

    expect(workflowService.run).not.toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith(
      'Bitte eine CSV- oder XLSX-Datei auswählen.',
      'OK',
      jasmine.objectContaining({ panelClass: ['danger-snackbar'] })
    );
  });

  it('prevents duplicate quick-start requests while a start request is pending', () => {
    const workflow = { id: 9, strategy_type: ImportStrategy.URL_DOI, published_at: new Date() } as ImportWorkflow;
    const runSubject = new Subject<{ status: string; dry_run: boolean }>();
    workflowService.run.and.returnValue(runSubject);

    component.quickStart(workflow);
    component.quickStart(workflow);

    expect(workflowService.run).toHaveBeenCalledTimes(1);
    expect(component.isQuickStartRunning(9)).toBeTrue();

    runSubject.error(new Error('failed'));
    expect(component.isQuickStartRunning(9)).toBeFalse();
  });

  it('does not start without a valid configured reporting year', () => {
    const workflow = { id: 10, strategy_type: ImportStrategy.URL_DOI, published_at: new Date() } as ImportWorkflow;
    configService.get.and.returnValue(of({ value: null } as any));

    component.quickStart(workflow);

    expect(workflowService.run).not.toHaveBeenCalled();
    expect(component.isQuickStartRunning(10)).toBeFalse();
    expect(snackBar.open).toHaveBeenCalledWith(
      'Quick-Start nicht möglich: Es ist kein gültiges Reporting Year konfiguriert.',
      'OK',
      jasmine.objectContaining({ panelClass: ['danger-snackbar'] })
    );
  });

  it('renders the row stop action and forwards its click without opening the workflow', () => {
    const workflow = { id: 11, label: 'Test' } as ImportWorkflow;
    workflowService.getStatus.and.returnValue(of({ progress: -1, status: 'running' }));
    workflowService.getProgress.and.returnValue(new Subject());
    component.table.dataSource.data = [workflow];
    component.afterDataLoaded([workflow]).subscribe();
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button[aria-label="Workflow stoppen"]') as HTMLButtonElement;
    expect(button).not.toBeNull();
    button.click();
    fixture.detectChanges();
    expect(workflowService.stopImport).toHaveBeenCalledOnceWith(11);
    expect(workflowService.isLocked).not.toHaveBeenCalled();
    expect(button.disabled).toBeTrue();
  });

  it('stops a running row once and waits beyond 100% for the terminal status', () => {
    const workflow = { id: 11, label: 'Test' } as ImportWorkflow;
    const progress = new Subject<{ progress: number; status: string }>();
    workflowService.getStatus.and.returnValue(of({ progress: 1, status: 'running' }));
    workflowService.getProgress.and.returnValue(progress);
    spyOn(component.table, 'updateData').and.returnValue(of(undefined));
    component.afterDataLoaded([workflow]).subscribe();
    expect(component.rowActions[1].visible?.(workflow)).toBeTrue();
    component.stopWorkflow(workflow);
    component.stopWorkflow(workflow);
    expect(workflowService.stopImport).toHaveBeenCalledOnceWith(11);
    expect(component.rowActions[1].disabled?.(workflow)).toBeTrue();
    progress.next({ progress: 1, status: 'stopping' });
    expect(component.rowActions[0].disabled?.(workflow)).toBeTrue();
    progress.next({ progress: 0, status: 'cancelled' });
    expect(component.rowActions[1].visible?.(workflow)).toBeFalse();
    expect(component.rowActions[0].disabled?.(workflow)).toBeFalse();
  });

  it('keeps stopping rows disabled after reload and offers cleanup for stale reports', () => {
    const workflow = { id: 11 } as ImportWorkflow;
    workflowService.getProgress.and.returnValue(new Subject());
    workflowService.getStatus.and.returnValue(of({ progress: -1, status: 'stopping', stopRequested: true }));
    component.afterDataLoaded([workflow]).subscribe();
    expect(component.rowActions[1].disabled?.(workflow)).toBeTrue();
    component.stopWorkflow(workflow);
    expect(workflowService.stopImport).not.toHaveBeenCalled();

    const stale = { id: 12 } as ImportWorkflow;
    workflowService.getStatus.and.returnValue(of({ progress: 0, status: 'started [stale]', stale: true, reportId: 71 }));
    component.afterDataLoaded([stale]).subscribe();
    expect(component.rowActions[1].visible?.(stale)).toBeTrue();
    workflowService.stopImport.and.returnValue(of({ state: 'interrupted', reportId: 71 }));
    workflowService.getProgress.and.returnValue(of({ progress: 0, status: 'interrupted' }));
    spyOn(component.table, 'updateData').and.returnValue(of(undefined));
    component.stopWorkflow(stale);
    expect(component.rowActions[1].visible?.(stale)).toBeFalse();
  });

  it('offers stop while a file start request is still pending and allows retry after errors', () => {
    const workflow = { id: 8, strategy_type: ImportStrategy.FILE_UPLOAD, published_at: new Date() } as ImportWorkflow;
    const request = new Subject<{ status: string; dry_run: boolean }>();
    const progress = new Subject<{ progress: number; status: string }>();
    workflowService.run.and.returnValue(request);
    workflowService.getProgress.and.returnValue(progress);
    component.quickStart(workflow);
    component.onQuickStartFileSelected({ target: { files: [new File(['title'], 'test.csv')], value: '' } } as unknown as Event);
    progress.next({ progress: 0, status: 'initialized' });
    expect(component.isQuickStartRunning(8)).toBeTrue();
    expect(component.rowActions[1].visible?.(workflow)).toBeFalse();
    progress.next({ progress: -1, status: 'started' });
    expect(component.rowActions[1].visible?.(workflow)).toBeTrue();
    const error = new Error('stop failed');
    workflowService.stopImport.and.returnValue(throwError(() => error));
    component.stopWorkflow(workflow);
    expect(component.rowActions[1].disabled?.(workflow)).toBeFalse();
    expect(component.isQuickStartRunning(8)).toBeTrue();
    expect(errorPresentation.present).toHaveBeenCalledWith(error, jasmine.objectContaining({ fallbackMessage: 'Workflow konnte nicht gestoppt werden.' }));
  });

  it('presents backend quick-start errors and re-enables the action', () => {
    const workflow = { id: 11, strategy_type: ImportStrategy.URL_DOI, published_at: new Date() } as ImportWorkflow;
    const error = new Error('already running');
    workflowService.run.and.returnValue(throwError(() => error));

    component.quickStart(workflow);

    expect(errorPresentation.present).toHaveBeenCalledWith(error, { action: 'run', entity: 'Import-Workflow' });
    expect(component.isQuickStartRunning(11)).toBeFalse();
  });
});
