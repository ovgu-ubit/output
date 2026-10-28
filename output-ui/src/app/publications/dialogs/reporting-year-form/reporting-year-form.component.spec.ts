import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { of } from 'rxjs';
import { ConfigService } from 'src/app/administration/services/config.service';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SharedModule } from 'src/app/shared/shared.module';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';

import { ReportingYearFormComponent } from './reporting-year-form.component';

describe('ReportingYearFormComponent', () => {
    beforeEach(() => {
        vi.useFakeTimers({ advanceTimeDelta: 1, shouldAdvanceTime: true });
    });
    afterEach(() => {
        vi.useRealTimers();
    });
    let component: ReportingYearFormComponent;
    let fixture: ComponentFixture<ReportingYearFormComponent>;

    const mockDialogRef = {
        close: vi.fn().mockName('close')
    };

    const mockPubService = {
        getReportingYears: vi.fn().mockName('getReportingYears').mockReturnValue(of([]))
    };

    const mockConfigService = {
        get: vi.fn().mockName('get').mockReturnValue(of({ value: {} })),
        set: vi.fn().mockName('set').mockReturnValue(of({}))
    };

    const mockAuthService = {
        checkPermission: vi.fn().mockName('checkPermission').mockReturnValue(true),
        hasRole: vi.fn().mockName('hasRole').mockReturnValue(true)
    };

    beforeEach(async () => {
        TestBed.configureTestingModule({
            imports: [
                NoopAnimationsModule,
                MatDialogModule,
                SharedModule
            ],
            declarations: [ReportingYearFormComponent],
            providers: [
                { provide: MatDialogRef, useValue: mockDialogRef },
                { provide: MAT_DIALOG_DATA, useValue: { reporting_year: 2024 } },
                { provide: PublicationService, useValue: mockPubService },
                { provide: ConfigService, useValue: mockConfigService },
                { provide: AuthorizationService, useValue: mockAuthService },
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                provideRouter([]),
                provideStore({})
            ]
        })
            .compileComponents();

        fixture = TestBed.createComponent(ReportingYearFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(0);
        fixture.detectChanges();
        await vi.runOnlyPendingTimersAsync();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize the all reporting years selection', () => {
        component.dialogData.allReportingYears = true;

        component.ngOnInit();

        expect(component.reporting_year).toBe(component.allReportingYearsValue);
    });

    it('should return all reporting years without changing the global default', () => {
        component.reporting_year = component.allReportingYearsValue;
        component.checked = true;

        component.action();

        expect(mockConfigService.set).not.toHaveBeenCalled();
        expect(mockDialogRef.close).toHaveBeenCalledWith({
            reportingYear: 2024,
            allReportingYears: true,
        });
    });

    it('should return a selected reporting year and allow it as the global default', () => {
        component.reporting_year = '2025' as any;
        component.checked = true;

        component.action();

        expect(mockConfigService.set).toHaveBeenCalledWith('reporting_year', 2025);
        expect(mockDialogRef.close).toHaveBeenCalledWith({
            reportingYear: 2025,
            allReportingYears: false,
        });
    });

    it('should convert reporting years returned by the backend to numbers', () => {
        mockPubService.getReportingYears.mockReturnValue(of([{ year: '2026' }, { year: null }]));

        component.ngOnInit();

        expect(component.reporting_years).toEqual([2026, null]);
    });
});
