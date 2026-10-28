import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { ContractService } from 'src/app/services/entities/contract.service';
import { PublisherService } from 'src/app/services/entities/publisher.service';
import { CostTypeService } from 'src/app/services/entities/cost-type.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { SharedModule } from 'src/app/shared/shared.module';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';

import { ContractFormComponent } from './contract-form.component';
import { AbstractFormComponent } from '../abstract-form/abstract-form.component';

describe('ContractFormComponent', () => {
    beforeEach(() => {
        vi.useFakeTimers({ advanceTimeDelta: 1, shouldAdvanceTime: true });
    });
    afterEach(() => {
        vi.useRealTimers();
    });
    let component: ContractFormComponent;
    let fixture: ComponentFixture<ContractFormComponent>;

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

    const mockContractService = {
        getAll: vi.fn().mockName('getAll').mockReturnValue(of([])),
        getOne: vi.fn().mockName('getOne').mockReturnValue(of({}))
    };

    beforeEach(async () => {
        TestBed.configureTestingModule({
            imports: [
                NoopAnimationsModule,
                ReactiveFormsModule,
                MatDialogModule,
                MatSnackBarModule,
                SharedModule
            ],
            declarations: [
                ContractFormComponent,
                AbstractFormComponent
            ],
            providers: [
                FormBuilder,
                { provide: MatDialogRef, useValue: mockDialogRef },
                { provide: MAT_DIALOG_DATA, useValue: { entity: {} } },
                { provide: AuthorizationService, useValue: mockAuthService },
                { provide: ErrorPresentationService, useValue: mockErrorService },
                { provide: ContractService, useValue: mockContractService },
                { provide: PublisherService, useValue: { getAll: () => of([]) } },
                { provide: CostTypeService, useValue: { getAll: () => of([]) } },
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                provideRouter([]),
                provideStore({})
            ]
        })
            .compileComponents();

        fixture = TestBed.createComponent(ContractFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(0);
        fixture.detectChanges();
        await vi.runOnlyPendingTimersAsync();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('does not add undefined invoice collections when cloning components', () => {
        const cloned = (component as any).cloneComponent({
            id: 1,
            label: 'Public component',
            invoices: undefined,
            pre_invoices: undefined,
        });

        expect(Object.prototype.hasOwnProperty.call(cloned, 'invoices')).toBe(false);
        expect(Object.prototype.hasOwnProperty.call(cloned, 'pre_invoices')).toBe(false);
    });

    it('keeps delivered invoice collections when cloning components', () => {
        const cloned = (component as any).cloneComponent({
            id: 1,
            label: 'Reader component',
            invoices: [],
            pre_invoices: [],
        });

        expect(cloned.invoices).toEqual([]);
        expect(cloned.pre_invoices).toEqual([]);
    });
});
