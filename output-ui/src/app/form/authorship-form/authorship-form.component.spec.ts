import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { AuthorService } from 'src/app/services/entities/author.service';
import { InstituteService } from 'src/app/services/entities/institute.service';
import { RoleService } from 'src/app/services/entities/role.service';
import { PublisherService } from 'src/app/services/entities/publisher.service';
import { CostTypeService } from 'src/app/services/entities/cost-type.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { SharedModule } from 'src/app/shared/shared.module';

import { AuthorshipFormComponent } from './authorship-form.component';

describe('AuthorshipFormComponent', () => {
    let component: AuthorshipFormComponent;
    let fixture: ComponentFixture<AuthorshipFormComponent>;

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

    const mockAuthorService = {
        getAll: vi.fn().mockName('getAll').mockReturnValue(of([])),
        getOne: vi.fn().mockName('getOne').mockReturnValue(of({}))
    };

    const mockInstService = {
        getAll: vi.fn().mockName('getAll').mockReturnValue(of([])),
        getOne: vi.fn().mockName('getOne').mockReturnValue(of({}))
    };

    const mockRoleService = {
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
            declarations: [AuthorshipFormComponent],
            providers: [
                FormBuilder,
                { provide: MatDialogRef, useValue: mockDialogRef },
                { provide: MAT_DIALOG_DATA, useValue: { entity: { author: { last_name: 'Doe', first_name: 'John' } } } },
                { provide: AuthorizationService, useValue: mockAuthService },
                { provide: ErrorPresentationService, useValue: mockErrorService },
                { provide: AuthorService, useValue: mockAuthorService },
                { provide: InstituteService, useValue: mockInstService },
                { provide: RoleService, useValue: mockRoleService },
                { provide: PublisherService, useValue: { getAll: () => of([]) } },
                { provide: CostTypeService, useValue: { getAll: () => of([]) } },
                provideHttpClient(withXhr()),
                provideHttpClientTesting()
            ]
        })
            .compileComponents();

        fixture = TestBed.createComponent(AuthorshipFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
