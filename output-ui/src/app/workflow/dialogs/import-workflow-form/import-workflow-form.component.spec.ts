import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ImportWorkflowFormComponent } from './import-workflow-form.component';
import { ImportFormFacade } from './import-form-facade.service';
import { WorkflowService } from '../../workflow.service';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { provideStore } from '@ngrx/store';

describe('ImportWorkflowFormComponent', () => {
  let component: ImportWorkflowFormComponent;
  let fixture: ComponentFixture<ImportWorkflowFormComponent>;

  const mockFacade = {
    import$: of({ id: 1, label: 'Test Workflow', version: 1 }),
    destroy$: of(null),
    load: jasmine.createSpy('load').and.returnValue(of({})),
    createNew: jasmine.createSpy('createNew').and.returnValue({}),
    destroy: jasmine.createSpy('destroy')
  };

  const mockWorkflowService = {
    unlockImport: jasmine.createSpy('unlockImport').and.returnValue(of({})),
    export: jasmine.createSpy('export').and.returnValue(of({}))
  };

  const mockRouter = {
    navigate: jasmine.createSpy('navigate'),
    navigateByUrl: jasmine.createSpy('navigateByUrl')
  };

  const mockActivatedRoute = {
    paramMap: of({ get: () => '1' }),
    snapshot: { paramMap: { get: () => '1' } }
  };

  beforeEach(fakeAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        ImportWorkflowFormComponent,
        NoopAnimationsModule,
        MatSnackBarModule,
        MatDialogModule
      ],
      providers: [
        { provide: ImportFormFacade, useValue: mockFacade },
        { provide: WorkflowService, useValue: mockWorkflowService },
        { provide: ErrorPresentationService, useValue: { present: jasmine.createSpy('present') } },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideStore({})
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportWorkflowFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
