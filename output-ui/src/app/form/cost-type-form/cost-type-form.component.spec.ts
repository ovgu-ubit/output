import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { CostTypeService } from 'src/app/services/entities/cost-type.service';
import { PublisherService } from 'src/app/services/entities/publisher.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { SharedModule } from 'src/app/shared/shared.module';

import { CostTypeFormComponent } from './cost-type-form.component';
import { AbstractFormComponent } from '../abstract-form/abstract-form.component';

describe('CostTypeFormComponent', () => {
    let component: CostTypeFormComponent;
    let fixture: ComponentFixture<CostTypeFormComponent>;

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

    const mockCostTypeService = {
        getAll: vi.fn().mockName('getAll').mockReturnValue(of([])),
        getOne: vi.fn().mockName('getOne').mockReturnValue(of({}))
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                NoopAnimationsModule,
                ReactiveFormsModule,
                MatDialogModule,
                MatSnackBarModule,
                SharedModule
            ],
            declarations: [
                CostTypeFormComponent,
                AbstractFormComponent
            ],
            providers: [
                FormBuilder,
                { provide: MatDialogRef, useValue: mockDialogRef },
                { provide: MAT_DIALOG_DATA, useValue: { entity: {} } },
                { provide: AuthorizationService, useValue: mockAuthService },
                { provide: ErrorPresentationService, useValue: mockErrorService },
                { provide: CostTypeService, useValue: mockCostTypeService },
                { provide: PublisherService, useValue: { getAll: () => of([]) } },
                provideHttpClient(withXhr()),
                provideHttpClientTesting()
            ]
        })
            .compileComponents();

        fixture = TestBed.createComponent(CostTypeFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
