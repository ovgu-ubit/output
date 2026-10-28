import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { of } from 'rxjs';
import { PublicationTypeService } from 'src/app/services/entities/publication-type.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SharedModule } from 'src/app/shared/shared.module';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';

import { PubTypeFormComponent } from './pub-type-form.component';
import { AbstractFormComponent } from '../abstract-form/abstract-form.component';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { PublisherService } from 'src/app/services/entities/publisher.service';
import { CostTypeService } from 'src/app/services/entities/cost-type.service';
import { MatSnackBarModule } from '@angular/material/snack-bar';

describe('PubTypeFormComponent', () => {
    beforeEach(() => {
        vi.useFakeTimers({ advanceTimeDelta: 1, shouldAdvanceTime: true });
    });
    afterEach(() => {
        vi.useRealTimers();
    });
    let component: PubTypeFormComponent;
    let fixture: ComponentFixture<PubTypeFormComponent>;

    const mockDialogRef = {
        close: vi.fn().mockName('close')
    };

    const mockPubTypeService = {
        getOne: vi.fn().mockName('getOne').mockReturnValue(of({}))
    };

    beforeEach(async () => {
        TestBed.configureTestingModule({
            imports: [
                NoopAnimationsModule,
                MatDialogModule,
                MatSnackBarModule,
                SharedModule
            ],
            declarations: [
                PubTypeFormComponent,
                AbstractFormComponent
            ],
            providers: [
                { provide: MatDialogRef, useValue: mockDialogRef },
                { provide: MAT_DIALOG_DATA, useValue: { entity: {} } },
                { provide: PublicationTypeService, useValue: mockPubTypeService },
                { provide: AuthorizationService, useValue: { hasRole: () => true } },
                { provide: ErrorPresentationService, useValue: { clearFieldErrors: () => { }, applyFieldErrors: () => { }, present: () => { } } },
                { provide: PublisherService, useValue: {} },
                { provide: CostTypeService, useValue: {} },
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                provideRouter([]),
                provideStore({})
            ]
        })
            .compileComponents();

        fixture = TestBed.createComponent(PubTypeFormComponent);
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
