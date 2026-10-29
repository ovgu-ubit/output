import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImportWorkflowFormComponent } from './import-workflow-form.component';
import { ImportFormFacade } from './import-form-facade.service';
import { WorkflowService } from '../../workflow.service';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { provideStore } from '@ngrx/store';

describe('ImportWorkflowFormComponent', () => {
    beforeEach(() => {
        vi.useFakeTimers({ advanceTimeDelta: 1, shouldAdvanceTime: true });
    });
    afterEach(() => {
        vi.useRealTimers();
    });
    let component: ImportWorkflowFormComponent;
    let fixture: ComponentFixture<ImportWorkflowFormComponent>;

    const mockFacade = {
        import$: of({ id: 1, label: 'Test Workflow', version: 1 }),
        destroy$: of(null),
        load: vi.fn().mockName('load').mockReturnValue(of({})),
        createNew: vi.fn().mockName('createNew').mockReturnValue({}),
        destroy: vi.fn().mockName('destroy')
    };

    const mockWorkflowService = {
        unlockImport: vi.fn().mockName('unlockImport').mockReturnValue(of({})),
        export: vi.fn().mockName('export').mockReturnValue(of({}))
    };

    const mockRouter = {
        navigate: vi.fn().mockName('navigate'),
        navigateByUrl: vi.fn().mockName('navigateByUrl')
    };

    const mockActivatedRoute = {
        paramMap: of({ get: () => '1' }),
        snapshot: { paramMap: { get: () => '1' } }
    };

    beforeEach(async () => {
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
                { provide: ErrorPresentationService, useValue: { present: vi.fn().mockName('present') } },
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                provideRouter([]),
                provideStore({})
            ]
        })
            .compileComponents();

        fixture = TestBed.createComponent(ImportWorkflowFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(0);
        fixture.detectChanges();
        await vi.runOnlyPendingTimersAsync();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
