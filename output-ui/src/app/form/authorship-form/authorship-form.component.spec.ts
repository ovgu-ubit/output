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
import { MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { By } from '@angular/platform-browser';

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
        mockDialogRef.close.mockClear();
        mockAuthorService.getAll.mockReturnValue(of([]));
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

    it('saves the ID of the second selected person with an identical name and no ORCID', async () => {
        const authors = [
            { id: 11, last_name: 'Müller', first_name: 'Alex', institutes: [{ id: 1, label: 'Physik' }] },
            { id: 22, last_name: 'Müller', first_name: 'Alex', institutes: [{ id: 2, label: 'Chemie' }] },
        ];
        mockAuthorService.getAll.mockReturnValue(of(authors));
        const selector = fixture.debugElement.query(By.css('app-select-author'));
        selector.componentInstance.updateEnts();
        fixture.detectChanges();
        const input = selector.nativeElement.querySelector('input') as HTMLInputElement;
        input.value = 'Müller';
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        selector.query(By.directive(MatAutocompleteTrigger)).injector.get(MatAutocompleteTrigger).openPanel();
        fixture.detectChanges();
        await fixture.whenStable();
        const options = document.querySelectorAll<HTMLElement>('mat-option');
        expect(options).toHaveLength(2);

        options[1].click();
        fixture.detectChanges();
        await fixture.whenStable();
        await component.action();

        expect(mockDialogRef.close).toHaveBeenCalledWith(expect.objectContaining({
            authorId: 22, author: authors[1],
        }));
    });
});
