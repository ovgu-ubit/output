import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImportFormActionComponent } from './import-form-action.component';
import { ImportFormFacade } from '../import-form-facade.service';
import { of, Subject, throwError } from 'rxjs';
import { FormBuilder } from '@angular/forms';
import { ImportStrategy, ImportStopResponse } from '@output/interfaces';
import { ImportProgress } from 'src/app/shared/import-progress';
import { WorkflowService } from 'src/app/workflow/workflow.service';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('ImportFormActionComponent', () => {
  let component: ImportFormActionComponent;
  let fixture: ComponentFixture<ImportFormActionComponent>;

  const mockFacade = {
    import$: of({}),
    destroy$: of(null)
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportFormActionComponent, NoopAnimationsModule],
      providers: [
        { provide: ImportFormFacade, useValue: mockFacade },
        provideHttpClient(withXhr()),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportFormActionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the workflow stop button and sends the request when clicked', async () => {
    const service = TestBed.inject(WorkflowService);
    const progress = new Subject<ImportProgress>();
    spyOn(service, 'getStatus').and.returnValue(of({ progress: -1, status: 'running' }));
    spyOn(service, 'getProgress').and.returnValue(progress);
    spyOn(service, 'stopImport').and.returnValue(of({ state: 'stopping', runId: 'run-1' }));
    component.entity = { id: 7, published_at: new Date() };
    await component.update();
    fixture.detectChanges();
    const button = Array.from(fixture.nativeElement.querySelectorAll('button'))
      .find((entry: HTMLButtonElement) => entry.textContent.includes('Stopp')) as HTMLButtonElement;
    expect(button).toBeDefined();
    button.click();
    fixture.detectChanges();
    expect(service.stopImport).toHaveBeenCalledOnceWith(7);
    expect(button.disabled).toBeTrue();
  });
});

describe('Import workflow action cancellation', () => {
  let component: ImportFormActionComponent;
  let service: jasmine.SpyObj<any>;
  let progress: Subject<ImportProgress>;
  let stopping: Subject<ImportStopResponse>;
  let errors: jasmine.SpyObj<any>;
  let snackBar: jasmine.SpyObj<any>;

  beforeEach(() => {
    progress = new Subject(); stopping = new Subject();
    service = jasmine.createSpyObj('WorkflowService', ['getStatus', 'getProgress', 'run', 'stopImport']);
    service.getStatus.and.returnValue(of({ progress: -1, status: 'running' }));
    service.getProgress.and.returnValue(progress);
    service.stopImport.and.returnValue(stopping);
    errors = jasmine.createSpyObj('ErrorPresentationService', ['present', 'applyFieldErrors']);
    snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
    component = new ImportFormActionComponent({} as never, service, snackBar, {} as never, new FormBuilder(), {} as never, errors);
    component.entity = { id: 7, published_at: new Date(), strategy_type: ImportStrategy.URL_DOI };
  });

  afterEach(() => component.ngOnDestroy());

  it('disables duplicate stop requests and keeps the form locked until progress is zero', async () => {
    await component.update();
    component.stop(); component.stop();
    expect(service.stopImport).toHaveBeenCalledOnceWith(7);
    stopping.next({ state: 'stopping', runId: 'run-1' });
    await Promise.resolve();
    progress.next({ progress: 1, status: 'stopping', stopRequested: true });
    expect(component.isRunning).toBeTrue();
    expect(component.stopping).toBeTrue();
    expect(component.form.disabled).toBeTrue();
    progress.next({ progress: 0, status: 'cancelled' });
    expect(component.isRunning).toBeFalse();
    expect(component.canStop).toBeFalse();
    expect(component.form.enabled).toBeTrue();
    expect(component.form.controls['update'].disabled).toBeTrue();
    expect(component.status.status).toBe('cancelled');
  });

  it('allows retry after stop failure without unlocking the form', async () => {
    await component.update();
    service.stopImport.and.returnValue(throwError(() => new Error('failed')));
    component.stop();
    expect(component.stopping).toBeFalse();
    expect(component.form.disabled).toBeTrue();
    component.stop();
    expect(service.stopImport).toHaveBeenCalledTimes(2);
    expect(errors.present).toHaveBeenCalled();
  });

  it('offers cleanup for an orphaned report and refreshes the terminal status', async () => {
    service.getStatus.and.returnValue(of({ progress: 0, status: 'old [stale]', stale: true, reportId: 71 }));
    await component.update();
    expect(component.canStop).toBeTrue();
    service.getStatus.and.returnValue(of({ progress: 0, status: 'interrupted', stale: false, reportId: 71 }));
    service.stopImport.and.returnValue(of({ state: 'interrupted', reportId: 71 }));
    component.stop();
    await Promise.resolve();
    expect(component.canStop).toBeFalse();
    expect(component.status.status).toBe('interrupted');
  });

  it('offers stop while the file start request is pending and does not announce a cancelled run as started', async () => {
    const request = new Subject();
    service.run.and.returnValue(request);
    component.entity.strategy_type = ImportStrategy.FILE_UPLOAD;
    component.run();
    progress.next({ progress: 0, status: 'initialized' });
    expect(component.isRunning).toBeTrue();
    expect(component.canStop).toBeFalse();
    progress.next({ progress: -1, status: 'running' });
    component.stop();
    stopping.next({ state: 'stopping', runId: 'run-1' });
    progress.next({ progress: 0, status: 'cancelled' });
    service.getStatus.and.returnValue(of({ progress: 0, status: 'cancelled' }));
    request.next({}); request.complete();
    await Promise.resolve();
    expect(component.isRunning).toBeFalse();
    expect(component.loading).toBeFalse();
    expect(snackBar.open.calls.allArgs().some(args => args[0] === 'Workflow gestartet.')).toBeFalse();
  });

  it('does not overwrite a newer terminal poll with an older status response', async () => {
    await component.update();
    const oldStatus = new Subject<ImportProgress>();
    service.getStatus.and.returnValue(oldStatus);
    const update = component.update();
    progress.next({ progress: 0, status: 'cancelled' });
    oldStatus.next({ progress: 0.9, status: 'running' }); oldStatus.complete();
    await update;
    expect(component.isRunning).toBeFalse();
    expect(component.status.status).toBe('cancelled');
  });

  it('cleans up its polling subscription on destruction', async () => {
    await component.update();
    expect(progress.observed).toBeTrue();
    component.ngOnDestroy();
    expect(progress.observed).toBeFalse();
  });
});
