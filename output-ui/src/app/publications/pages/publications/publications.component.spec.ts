import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { of } from 'rxjs';
import { CompareOperation, JoinOperation } from '@output/interfaces';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { StatusService } from 'src/app/services/entities/status.service';
import { ConfigService } from 'src/app/administration/services/config.service';
import { EnrichService } from 'src/app/administration/services/enrich.service';
import { RuntimeConfigService } from 'src/app/services/runtime-config.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SharedModule } from 'src/app/shared/shared.module';
import { TableModule } from 'src/app/table/table.module';
import { setReportingYear } from 'src/app/services/redux';

import { PublicationsComponent } from './publications.component';

describe('PublicationsComponent', () => {
    beforeEach(() => {
        vi.useFakeTimers({ advanceTimeDelta: 1, shouldAdvanceTime: true });
    });
    afterEach(() => {
        vi.useRealTimers();
    });
    let component: PublicationsComponent;
    let fixture: ComponentFixture<PublicationsComponent>;

    const mockPublicationService = {
        getFilters: vi.fn().mockName('getFilters').mockReturnValue(of([])),
        updateAll: vi.fn().mockName('updateAll').mockReturnValue(of(0)),
        indexPage: vi.fn().mockName('indexPage').mockReturnValue(of({ items: [], total: 0, page: 0, page_size: 10 })),
    };

    const mockStatusService = {
        getAll: vi.fn().mockName('getAll').mockReturnValue(of([]))
    };

    const mockConfigService = {
        get: vi.fn().mockName('get').mockReturnValue(of({ value: {} }))
    };

    const mockEnrichService = {
        getEnrichs: vi.fn().mockName('getEnrichs').mockReturnValue(of([])),
        startID: vi.fn().mockName('startID').mockReturnValue(of({}))
    };

    const mockRuntimeConfigService = {
        getValue: vi.fn().mockName('getValue').mockReturnValue('http://localhost/')
    };

    const mockAuthService = {
        hasRole: vi.fn().mockName('hasRole').mockReturnValue(true)
    };

    beforeEach(async () => {
        TestBed.configureTestingModule({
            imports: [
                NoopAnimationsModule,
                MatSnackBarModule,
                MatTooltipModule,
                SharedModule,
                TableModule
            ],
            declarations: [PublicationsComponent],
            providers: [
                provideMockStore({}),
                { provide: PublicationService, useValue: mockPublicationService },
                { provide: StatusService, useValue: mockStatusService },
                { provide: ConfigService, useValue: mockConfigService },
                { provide: EnrichService, useValue: mockEnrichService },
                { provide: RuntimeConfigService, useValue: mockRuntimeConfigService },
                { provide: AuthorizationService, useValue: mockAuthService },
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                provideRouter([])
            ]
        })
            .compileComponents();

        fixture = TestBed.createComponent(PublicationsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(0);
        fixture.detectChanges();
        await vi.runOnlyPendingTimersAsync();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should combine table state and publication filters in page requests', () => {
        component.indexOptions = {
            soft: false,
            allReportingYears: true,
            filter: { expressions: [] },
            paths: ['missing-invoice'],
        };

        component.loadPage({
            page: 1,
            page_size: 20,
            sort: [{ key: 'title', direction: 'asc' }, { key: 'unsupported', direction: 'desc' }],
            column_filters: { publisher: 'Springer', unsupported: 'ignored' },
        }, 2025).subscribe();

        expect(mockPublicationService.indexPage).toHaveBeenLastCalledWith(expect.objectContaining({
            page: 1,
            page_size: 20,
            reporting_year: 2025,
            all_reporting_years: true,
            paths: ['missing-invoice'],
            sort: [{ key: 'title', direction: 'asc' }],
            column_filters: { publisher: 'Springer' },
        }));
    });

    it('should roundtrip JSON encoded filter links with array values', () => {
        component.indexOptions = {
            soft: false,
            filter: {
                expressions: [{
                        op: JoinOperation.AND,
                        key: 'title',
                        comp: CompareOperation.IN,
                        value: ['alpha,beta', 'gamma'],
                    }]
            },
            paths: ['missing-invoice']
        };

        const query = component.filterToQuery();
        const params = new URLSearchParams(query.slice(1));
        const roundtrip = component.queryToFilter(convertToParamMap({
            filter: params.getAll('filter'),
            path: params.getAll('path'),
        }));

        expect(roundtrip.filter.expressions[0]).toEqual(expect.objectContaining({
            op: JoinOperation.AND,
            key: 'title',
            comp: CompareOperation.IN,
            value: ['alpha,beta', 'gamma'],
        }));
        expect(roundtrip.paths).toEqual(['missing-invoice']);
    });

    it('should read legacy comma separated filter links', () => {
        const result = component.queryToFilter(convertToParamMap({
            filter: [`${JoinOperation.AND},title,${CompareOperation.EQUALS},alpha,beta`],
            path: ['missing-invoice'],
        }));

        expect(result.filter.expressions[0]).toEqual(expect.objectContaining({
            op: JoinOperation.AND,
            key: 'title',
            comp: CompareOperation.EQUALS,
            value: 'alpha,beta',
        }));
        expect(result.paths).toEqual(['missing-invoice']);
    });

    it('should read links that only contain saved filter paths', () => {
        const result = component.queryToFilter(convertToParamMap({
            path: ['missing-invoice'],
        }));

        expect(result.filter.expressions).toEqual([]);
        expect(result.paths).toEqual(['missing-invoice']);
    });

    it('should roundtrip the all-reporting-years mode in links', () => {
        component.indexOptions = {
            soft: false,
            allReportingYears: true,
        };

        const query = component.filterToQuery();
        const params = new URLSearchParams(query.slice(1));
        const result = component.queryToFilter(convertToParamMap({
            allReportingYears: params.get('allReportingYears'),
        }));

        expect(params.get('allReportingYears')).toBe('true');
        expect(result.allReportingYears).toBe(true);
        expect(result.filter.expressions).toEqual([]);
        expect(result.paths).toEqual([]);
    });

    it('should restore the all-reporting-years mode from the view config', () => {
        const store = TestBed.inject(MockStore);
        store.setState({
            viewConfigReducer: {
                viewConfig: {
                    sortState: [],
                    filterColumn: new Map(),
                    allReportingYears: true,
                },
                valid_from: new Date(),
            },
        });

        const subscription = component.preProcessing().subscribe();

        expect(component.indexOptions?.allReportingYears).toBe(true);
        subscription.unsubscribe();
    });

    it('should switch to all reporting years and preserve the selected year', () => {
        const setTableReportingYear = vi.fn().mockName('setReportingYear');
        component.table = {
            reporting_year: 2025,
            setReportingYear: setTableReportingYear,
            resetPage: vi.fn(),
            getViewConfig: () => ({ sortState: [], filterColumn: new Map(), allReportingYears: true }),
            updateData: () => of([]),
        } as any;
        component.viewConfig = { sortState: [], filterColumn: new Map() };
        component.indexOptions = { soft: false, allReportingYears: false };
        vi.spyOn(component.dialog, 'open').mockReturnValue({
            afterClosed: () => of({ reportingYear: 2025, allReportingYears: true }),
        } as any);
        const store = TestBed.inject(MockStore);
        vi.spyOn(store, 'dispatch').mockReturnValue(undefined);

        component.changeReportingYear();

        expect(component.indexOptions.allReportingYears).toBe(true);
        expect(setTableReportingYear).toHaveBeenCalledWith(2025, true);
        expect(store.dispatch).not.toHaveBeenCalledWith(setReportingYear({ reporting_year: 2025 }));
    });

    it('should leave the all-reporting-years mode when a year is selected', () => {
        const setTableReportingYear = vi.fn().mockName('setReportingYear');
        component.table = {
            reporting_year: 2025,
            setReportingYear: setTableReportingYear,
            resetPage: vi.fn(),
            getViewConfig: () => ({ sortState: [], filterColumn: new Map(), allReportingYears: false }),
            updateData: () => of([]),
        } as any;
        component.viewConfig = { sortState: [], filterColumn: new Map(), allReportingYears: true };
        component.indexOptions = { soft: false, allReportingYears: true };
        vi.spyOn(component.dialog, 'open').mockReturnValue({
            afterClosed: () => of({ reportingYear: 2024, allReportingYears: false }),
        } as any);
        const store = TestBed.inject(MockStore);
        vi.spyOn(store, 'dispatch').mockReturnValue(undefined);

        component.changeReportingYear();

        expect(component.indexOptions.allReportingYears).toBe(false);
        expect(setTableReportingYear).toHaveBeenCalledWith(2024, false);
        expect(store.dispatch).toHaveBeenCalledWith(setReportingYear({ reporting_year: 2024 }));
    });

    it('should preserve all reporting years when advanced filters are cleared', () => {
        const updateData = vi.fn().mockName('updateData').mockReturnValue(of([]));
        component.table = {
            resetPage: vi.fn(),
            getViewConfig: () => ({ sortState: [], filterColumn: new Map(), allReportingYears: true }),
            updateData,
        } as any;
        component.viewConfig = {
            sortState: [],
            filterColumn: new Map(),
            allReportingYears: true,
            filter: {
                filter: {
                    expressions: [{
                            op: JoinOperation.AND,
                            key: 'title',
                            comp: CompareOperation.INCLUDES,
                            value: 'Angular',
                        }],
                },
                paths: ['missing-invoice'],
            },
        };
        component.indexOptions = {
            soft: false,
            allReportingYears: true,
            filter: component.viewConfig.filter.filter,
            paths: component.viewConfig.filter.paths,
        };
        vi.spyOn(component.dialog, 'open').mockReturnValue({
            afterClosed: () => of({ filter: { expressions: [] }, paths: [] }),
        } as any);

        component.extendedFilters();

        expect(component.indexOptions).toEqual(expect.objectContaining({
            soft: false,
            allReportingYears: true,
            filter: { expressions: [] },
            paths: [],
        }));
        expect(component.viewConfig.allReportingYears).toBe(true);
        expect(updateData).toHaveBeenCalled();
    });
});
