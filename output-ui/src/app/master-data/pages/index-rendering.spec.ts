import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Store } from '@ngrx/store';
import { delay, of, Subject } from 'rxjs';
import { ConfigService } from '../../administration/services/config.service';
import { EnrichService } from '../../administration/services/enrich.service';
import { ErrorPresentationService } from '../../core/errors/error-presentation.service';
import { PublicationsComponent } from '../../publications/pages/publications/publications.component';
import { AuthorizationService } from '../../security/authorization.service';
import { InstituteService } from '../../services/entities/institute.service';
import { PublicationService } from '../../services/entities/publication.service';
import { StatusService } from '../../services/entities/status.service';
import { RuntimeConfigService } from '../../services/runtime-config.service';
import { selectReportingYear } from '../../services/redux';
import { SharedModule } from '../../shared/shared.module';
import { TableComponent } from '../../table/table-component/table.component';
import { TableModule } from '../../table/table.module';
import { InstitutionsComponent } from './institutions/institutions.component';

// A repeatable rendering-only sample: identical fixtures, no HTTP or database time.
describe('Index rendering samples', () => {
    for (const kind of ['institutes', 'publications'] as const) {
        for (const pageSize of [10, 100]) {
            it(`renders and refreshes ${pageSize} ${kind}`, async () => {
                let response = new Subject<any>();
                const indexPage = vi.fn((_request: unknown, ..._options: unknown[]) => response);
                const deleteEntity = vi.fn(() => of({ affected: 1 }));
                const hasRole = vi.fn(() => true);
                const errors = { present: vi.fn() };
                await TestBed.configureTestingModule({
                    imports: [SharedModule, TableModule, NoopAnimationsModule],
                    declarations: [InstitutionsComponent, PublicationsComponent],
                    providers: [
                        provideRouter([]),
                        { provide: Store, useValue: { select: (selector: unknown) => of(selector === selectReportingYear ? 2026 : undefined), dispatch: vi.fn() } },
                        { provide: ConfigService, useValue: { get: (key: string) => of({ value: key === 'pub_index_columns'
                            ? { title: true, doi: true, authors_inst: true, publisher: true, status: true, net_costs: true }
                            : key === 'reporting_year' ? 2026 : 'Test' }).pipe(delay(0)) } },
                        { provide: InstituteService, useValue: { indexPage, delete: deleteEntity } },
                        { provide: PublicationService, useValue: { indexPage, delete: deleteEntity } },
                        { provide: StatusService, useValue: { getAll: () => of([]) } },
                        { provide: EnrichService, useValue: { getEnrichs: () => of([]) } },
                        { provide: RuntimeConfigService, useValue: { getValue: () => '' } },
                        { provide: AuthorizationService, useValue: { hasRole } },
                        { provide: ErrorPresentationService, useValue: errors },
                    ],
                }).compileComponents();
                const fixture = kind === 'institutes'
                    ? TestBed.createComponent(InstitutionsComponent) : TestBed.createComponent(PublicationsComponent);
                const viewChanges = new Subject<void>();
                Object.assign(fixture.componentInstance, { viewChanges$: viewChanges });
                fixture.detectChanges();
                await fixture.whenStable();
                const table = fixture.debugElement.query(By.directive(TableComponent)).componentInstance as TableComponent<any, any>;
                const rows = Array.from({ length: pageSize }, (_, id) => ({
                    id: id + 1, label: `Institut ${id}`, title: `Publikation ${id}`, doi: `10.1234/${id}`,
                    authors_inst: 'Ada Lovelace; Grace Hopper', publisher: 'Testverlag', status: 1,
                    sub_inst_count: 2, author_count: 5, author_count_total: 10, pub_count: 20, pub_count_corr: 3, net_costs: 1234.56,
                }));
                const deliver = async (page = 0) => {
                    response.next({ items: rows.map(row => ({ ...row })), total: 5818, page, page_size: pageSize });
                    response.complete();
                    await fixture.whenStable();
                    fixture.detectChanges();
                    // Include layout calculation, but no artificial network delay.
                    fixture.nativeElement.getBoundingClientRect();
                };
                const started = performance.now();
                await deliver();
                const firstRenderMs = performance.now() - started;
                const originalRow = fixture.nativeElement.querySelector('tr.mat-mdc-row');
                rows[0].label = 'Institut aktualisiert';
                rows[0].title = 'Publikation aktualisiert';
                const refreshTimes: number[] = [];
                for (let repeat = 0; repeat < 5; repeat++) {
                    response = new Subject<any>();
                    table.updateData().subscribe();
                    const refreshStarted = performance.now();
                    await deliver();
                    refreshTimes.push(performance.now() - refreshStarted);
                }
                const checksStarted = performance.now();
                const roleChecksBefore = hasRole.mock.calls.length;
                for (let check = 0; check < 20; check++) fixture.detectChanges();
                console.info('Index rendering sample', JSON.stringify({ kind, pageSize,
                    firstRenderMs: Math.round(firstRenderMs),
                    medianRefreshMs: Math.round(refreshTimes.sort((a, b) => a - b)[2]),
                    twentyChecksMs: Math.round(performance.now() - checksStarted),
                    roleChecks: hasRole.mock.calls.length,
                    rowReused: originalRow === fixture.nativeElement.querySelector('tr.mat-mdc-row'),
                }));
                expect(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row').length).toBe(pageSize);
                expect(table.rowCount).toBe(5818);
                expect(originalRow).toBe(fixture.nativeElement.querySelector('tr.mat-mdc-row'));
                expect(originalRow.textContent).toContain(kind === 'institutes' ? 'Institut aktualisiert' : 'Publikation aktualisiert');
                expect(hasRole.mock.calls.length).toBe(roleChecksBefore);

                if (pageSize === 10) {
                    fixture.autoDetectChanges();
                    const column = kind === 'institutes' ? 'label' : 'title';
                    const headerCell = fixture.nativeElement.querySelector(`th.mat-column-${column}`);
                    const filterControl = table.filterControls[column];
                    fixture.componentInstance.headers = fixture.componentInstance.headers.map(header => ({ ...header }));
                    await fixture.whenStable();
                    expect(fixture.nativeElement.querySelector(`th.mat-column-${column}`)).toBe(headerCell);
                    expect(table.filterControls[column]).toBe(filterControl);
                    response = new Subject<any>();
                    table.handlePage({ pageIndex: 2, pageSize, length: 5818 });
                    await fixture.whenStable();
                    expect(fixture.nativeElement.querySelector('.table-loading-overlay')).not.toBeNull();
                    expect(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row').length).toBe(pageSize);
                    expect(indexPage.mock.lastCall?.[0]).toEqual(expect.objectContaining({ page: 2, page_size: pageSize }));
                    await deliver(2);
                    expect(table.paginator.pageIndex).toBe(2);
                    expect(table.paginator2.pageIndex).toBe(2);
                    expect(fixture.nativeElement.querySelector('.table-loading-overlay')).toBeNull();

                    response = new Subject<any>();
                    table.searchControl.setValue('Test');
                    await new Promise(resolve => setTimeout(resolve, 350));
                    expect(indexPage.mock.lastCall?.[0]).toEqual(expect.objectContaining({ q: 'Test', page: 0 }));
                    const filterableColumns = fixture.componentInstance.headers
                        .filter(header => fixture.nativeElement.querySelector(`.mat-column-${header.colName}-filter input`))
                        .map(header => header.colName);
                    expect(indexPage.mock.lastCall?.[0]).toEqual(expect.objectContaining({ search_columns: filterableColumns }));
                    expect(filterableColumns).toContain(column);
                    expect(filterableColumns).not.toContain('net_costs');
                    expect(filterableColumns).not.toContain('pub_count');
                    expect(filterableColumns).not.toContain('author_count');
                    expect(filterableColumns).not.toContain('author_count_total');
                    expect(filterableColumns).not.toContain('sub_inst_count');
                    await deliver();

                    response = new Subject<any>();
                    const filter = fixture.nativeElement.querySelector(`.mat-column-${column}-filter input`) as HTMLInputElement;
                    filter.value = 'Angular';
                    filter.dispatchEvent(new Event('input', { bubbles: true }));
                    await new Promise(resolve => setTimeout(resolve, 350));
                    expect(indexPage.mock.lastCall?.[0]).toEqual(expect.objectContaining({
                        q: undefined, page: 0, column_filters: { [column]: 'Angular' },
                    }));
                    await deliver();

                    response = new Subject<any>();
                    table.announceSortChange({ active: column, direction: 'asc' });
                    await deliver();
                    response = new Subject<any>();
                    table.announceSortChange({ active: 'id', direction: 'desc' });
                    await deliver();
                    expect(indexPage.mock.lastCall?.[0]).toEqual(expect.objectContaining({ sort: [
                        { key: column, direction: 'asc' }, { key: 'id', direction: 'desc' },
                    ] }));
                    expect(fixture.nativeElement.querySelector(`th.mat-column-${column} .numbered-sort-header`).textContent).toContain('1');
                    expect(fixture.nativeElement.querySelector('th.mat-column-id .numbered-sort-header').textContent).toContain('2');

                    table.setViewConfig({ sortState: [{ key: column, dir: 'desc' }], filterColumn: new Map([[column, 'Saved']]), page: 1, pageSize });
                    response = new Subject<any>();
                    table.updateData().subscribe();
                    await deliver(1);
                    expect(table.filterControls[column].value).toBe('Saved');
                    expect(table.paginator.pageIndex).toBe(1);
                    expect(table.paginator2.pageIndex).toBe(1);
                    expect(fixture.nativeElement.querySelector(`th.mat-column-${column} .bottom.active`)).not.toBeNull();

                    // A superseded response must neither replace the rows nor hide the current spinner.
                    response = new Subject<any>();
                    table.updateData().subscribe();
                    const stale = response;
                    response = new Subject<any>();
                    table.updateData().subscribe();
                    stale.next({ items: [], total: 0, page: 0, page_size: pageSize });
                    stale.complete();
                    await fixture.whenStable();
                    expect(stale.observed).toBe(false);
                    expect(fixture.nativeElement.querySelector('.table-loading-overlay')).not.toBeNull();
                    expect(table.rowCount).toBe(5818);
                    await deliver(1);

                    response = new Subject<any>();
                    table.handlePage({ pageIndex: 2, pageSize, length: 5818 });
                    response.error(new Error('offline'));
                    await fixture.whenStable();
                    expect(errors.present).toHaveBeenCalledTimes(1);
                    expect(fixture.nativeElement.querySelector('.table-loading-overlay')).toBeNull();
                    expect(fixture.nativeElement.querySelectorAll('tr.mat-mdc-row').length).toBe(pageSize);

                    table.resetView();
                    response = new Subject<any>();
                    table.updateData().subscribe();
                    await deliver();
                    expect(table.filterControls[column].value).toBe('');
                    expect(table.paginator.pageIndex).toBe(0);
                    expect(table.paginator2.pageIndex).toBe(0);
                    expect(fixture.nativeElement.querySelector(`th.mat-column-${column} .bottom.active`)).toBeNull();

                    // An asynchronous configuration update refreshes cached permissions and buttons.
                    const asyncAction = vi.fn();
                    fixture.componentInstance.buttons.push({ title: 'Asynchroner Button', roles: ['admin'], action_function: asyncAction });
                    hasRole.mockReturnValue(false);
                    viewChanges.next();
                    await fixture.whenStable();
                    const button = (text: string) => Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
                        .find(element => element.textContent?.trim() === text)!;
                    expect(button('Hinzufügen').disabled).toBe(true);
                    expect(button('Asynchroner Button').disabled).toBe(true);
                    expect(fixture.nativeElement.querySelector('.row-actions-cell mat-icon').textContent.trim()).toBe('remove_red_eye');
                    hasRole.mockReturnValue(true);
                    viewChanges.next();
                    await fixture.whenStable();
                    button('Asynchroner Button').click();
                    expect(asyncAction).toHaveBeenCalledOnce();

                    // Persisted create/edit dialogs reload through the same asynchronous OnPush path.
                    const dialog = vi.spyOn(TestBed.inject(MatDialog), 'open');
                    for (const mode of ['create', 'update'] as const) {
                        const closed = new Subject<any>();
                        dialog.mockReturnValue({ afterClosed: () => closed } as any);
                        if (mode === 'create') button('Hinzufügen').click();
                        else (fixture.nativeElement.querySelector('.row-actions-cell button') as HTMLButtonElement).click();
                        response = new Subject<any>();
                        closed.next({ persisted: true, mode, entity: { id: 1 } });
                        closed.complete();
                        await fixture.whenStable();
                        expect(fixture.nativeElement.querySelector('.table-loading-overlay')).not.toBeNull();
                        await deliver();
                        expect(fixture.nativeElement.querySelector('.table-loading-overlay')).toBeNull();
                    }
                    const confirmed = new Subject<any>();
                    dialog.mockReturnValue({ afterClosed: () => confirmed } as any);
                    table.selection.select(table.dataSource[0]);
                    button('Löschen').click();
                    response = new Subject<any>();
                    confirmed.next({ soft: false });
                    confirmed.complete();
                    await deliver();
                    expect(deleteEntity).toHaveBeenCalledWith([1], false);
                    expect(table.selection.isEmpty()).toBe(true);
                }
                fixture.destroy();
            });
        }
    }
});
