import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImportFormOverviewComponent } from './import-form-overview.component';
import { ImportFormFacade } from '../import-form-facade.service';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('ImportFormOverviewComponent', () => {
    let component: ImportFormOverviewComponent;
    let fixture: ComponentFixture<ImportFormOverviewComponent>;

    const mockFacade = {
        import$: of(null),
        destroy$: of(null),
        getReports: vi.fn().mockName('getReports').mockReturnValue(of([])),
        deleteReport: vi.fn().mockName('deleteReport').mockReturnValue(of({}))
    };

    const mockRouter = {
        navigate: vi.fn().mockName('navigate')
    };

    const mockActivatedRoute = {
        params: of({})
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ImportFormOverviewComponent, NoopAnimationsModule],
            providers: [
                { provide: ImportFormFacade, useValue: mockFacade },
                { provide: Router, useValue: mockRouter },
                { provide: ActivatedRoute, useValue: mockActivatedRoute },
                provideHttpClient(withXhr()),
                provideHttpClientTesting()
            ]
        })
            .compileComponents();

        fixture = TestBed.createComponent(ImportFormOverviewComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
