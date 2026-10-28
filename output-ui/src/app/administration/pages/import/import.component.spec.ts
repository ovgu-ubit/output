import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { of, Subject } from 'rxjs';
import { ImportProgress } from 'src/app/shared/import-progress';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ImportService } from 'src/app/administration/services/import.service';
import { ReportService } from 'src/app/administration/services/report.service';
import { SharedModule } from 'src/app/shared/shared.module';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ImportComponent } from './import.component';

describe('ImportComponent', () => {
  let component: ImportComponent;
  let fixture: ComponentFixture<ImportComponent>;

  const mockImportService = {
    isRunning: jasmine.createSpy('isRunning').and.returnValue(of([])),
    getImports: jasmine.createSpy('getImports').and.returnValue(of([
      { path: 'crossref', label: 'Crossref' }
    ])),
    getStatus: jasmine.createSpy('getStatus').and.returnValue(of([])),
    start: jasmine.createSpy('start').and.returnValue(of({})),
    stop: jasmine.createSpy('stop').and.returnValue(of({ state: 'stopping', runId: 'run-1' })),
    getProgress: jasmine.createSpy('getProgress').and.returnValue(of({ progress: 0, status: '' }))
  };

  const mockReportService = {
    getReports: jasmine.createSpy('getReports').and.returnValue(of([]))
  };

  beforeEach(async () => {
    mockImportService.getProgress.and.returnValue(of({ progress: 0, status: '' }));
    mockImportService.stop.calls.reset();
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatSnackBarModule,
        MatProgressBarModule,
        SharedModule,
        RouterTestingModule
      ],
      declarations: [ ImportComponent ],
      providers: [
        { provide: ImportService, useValue: mockImportService },
        { provide: ReportService, useValue: mockReportService },
        provideHttpClient(withXhr()),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders a stop button and disables it after a click until cancellation completes', async () => {
    await fixture.whenStable();
    const progress = new Subject<ImportProgress>();
    mockImportService.getProgress.and.returnValue(progress);
    component.forms['Crossref'].controls['reporting_year'].setValue(2026);
    component.startImport({ path: 'crossref', label: 'Crossref' });
    progress.next({ progress: 0.5, status: 'running' });
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button.warn-button') as HTMLButtonElement;
    expect(button.textContent).toContain('Stopp');
    button.click();
    fixture.detectChanges();
    expect(mockImportService.stop).toHaveBeenCalledOnceWith('crossref');
    expect(button.disabled).toBeTrue();
    expect(button.textContent).toContain('Wird gestoppt');
    progress.next({ progress: 0, status: 'cancelled' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button.warn-button')).toBeNull();
  });

  it('starts legacy imports with a boolean update value', async () => {
    await fixture.whenStable();
    component.forms['Crossref'].controls['reporting_year'].setValue(2026);

    component.startImport({ path: 'crossref', label: 'Crossref' });

    expect(mockImportService.start).toHaveBeenCalledWith('crossref', false, 2026, false);
  });
});
