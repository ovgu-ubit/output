import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { InvoiceService } from 'src/app/services/entities/invoice.service';
import { PublisherService } from 'src/app/services/entities/publisher.service';
import { CostTypeService } from 'src/app/services/entities/cost-type.service';
import { CostCenterService } from 'src/app/services/entities/cost-center.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { SharedModule } from 'src/app/shared/shared.module';
import { TableModule } from 'src/app/table/table.module';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';

import { InvoiceFormComponent } from './invoice-form.component';

describe('InvoiceFormComponent', () => {
    beforeEach(() => {
        vi.useFakeTimers({ advanceTimeDelta: 1, shouldAdvanceTime: true });
    });
    afterEach(() => {
        vi.useRealTimers();
    });
    let component: InvoiceFormComponent;
    let fixture: ComponentFixture<InvoiceFormComponent>;

    const mockDialogRef = {
        close: vi.fn().mockName('close')
    };

    const mockAuthService = {
        hasRole: vi.fn().mockName('hasRole').mockReturnValue(true)
    };

    const mockErrorService = {
        clearFieldErrors: vi.fn().mockName('clearFieldErrors'),
        applyFieldErrors: vi.fn().mockName('applyFieldErrors'),
        present: vi.fn().mockName('present')
    };

    const mockInvoiceService = {
        getOne: vi.fn().mockName('getOne').mockReturnValue(of({}))
    };

    const mockCostCenterService = {
        getAll: vi.fn().mockName('getAll').mockReturnValue(of([]))
    };

    beforeEach(async () => {
        TestBed.configureTestingModule({
            imports: [
                NoopAnimationsModule,
                ReactiveFormsModule,
                MatDialogModule,
                MatSnackBarModule,
                SharedModule,
                TableModule
            ],
            declarations: [InvoiceFormComponent],
            providers: [
                FormBuilder,
                { provide: MatDialogRef, useValue: mockDialogRef },
                { provide: MAT_DIALOG_DATA, useValue: { entity: {} } },
                { provide: AuthorizationService, useValue: mockAuthService },
                { provide: ErrorPresentationService, useValue: mockErrorService },
                { provide: InvoiceService, useValue: mockInvoiceService },
                { provide: CostCenterService, useValue: mockCostCenterService },
                { provide: PublisherService, useValue: { getAll: () => of([]) } },
                { provide: CostTypeService, useValue: { getAll: () => of([]) } },
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                provideRouter([]),
                provideStore({})
            ]
        })
            .compileComponents();

        fixture = TestBed.createComponent(InvoiceFormComponent);
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
