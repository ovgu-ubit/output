import type { MockedObject } from "vitest";
import { FormBuilder } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, of, throwError } from 'rxjs';
import { CSVMapping, ImportStopResponse } from '@output/interfaces';
import { ImportProgress } from 'src/app/shared/import-progress';
import { ImportComponent } from './import/import.component';
import { EnrichComponent } from './enrich/enrich.component';

for (const kind of ['import', 'csv', 'xls', 'enrich']) {
    describe(`Legacy ${kind} stop controls`, () => {
        let component: ImportComponent | EnrichComponent;
        let progress: Subject<ImportProgress>;
        let starting: Subject<unknown>;
        let stopping: Subject<ImportStopResponse>;
        let service: MockedObject<any>;
        let reports: MockedObject<any>;
        const entry = { path: kind === 'enrich' || kind === 'import' ? 'crossref' : kind, label: 'Test' };

        beforeEach(async () => {
            progress = new Subject();
            starting = new Subject();
            stopping = new Subject();
            service = {
                getImports: vi.fn().mockName("LegacyService.getImports"),
                getEnrichs: vi.fn().mockName("LegacyService.getEnrichs"),
                getStatus: vi.fn().mockName("LegacyService.getStatus"),
                isRunning: vi.fn().mockName("LegacyService.isRunning"),
                getProgress: vi.fn().mockName("LegacyService.getProgress"),
                start: vi.fn().mockName("LegacyService.start"),
                startYear: vi.fn().mockName("LegacyService.startYear"),
                startCSV: vi.fn().mockName("LegacyService.startCSV"),
                startExcel: vi.fn().mockName("LegacyService.startExcel"),
                stop: vi.fn().mockName("LegacyService.stop")
            };
            service.getImports.mockReturnValue(of([entry]));
            service.getEnrichs.mockReturnValue(of([entry]));
            service.getStatus.mockResolvedValue([]);
            service.isRunning.mockResolvedValue([]);
            service.getProgress.mockReturnValue(progress);
            for (const method of ['start', 'startYear', 'startCSV', 'startExcel'])
                service[method].mockReturnValue(starting);
            service.stop.mockReturnValue(stopping);
            reports = {
                getReports: vi.fn().mockName("ReportService.getReports")
            };
            reports.getReports.mockReturnValue(of(['old.log']));
            const snackBar = {
                open: vi.fn().mockName("MatSnackBar.open")
            };
            component = kind === 'enrich'
                ? new EnrichComponent(reports, service, new FormBuilder(), {} as never, snackBar as unknown as MatSnackBar)
                : new ImportComponent(reports, service, new FormBuilder(), {} as never, snackBar as unknown as MatSnackBar);
            await component.ngOnInit();
            component.forms[entry.label].controls['reporting_year'].setValue(2026);
            if (component instanceof ImportComponent) {
                component.file = new File(['title'], kind === 'xls' ? 'test.xlsx' : 'test.csv');
                component.csv_format = { name: 'Test' } as CSVMapping;
            }
        });

        afterEach(() => component.ngOnDestroy());

        it('allows stop during a pending start and stays disabled at 100% until the backend finishes', () => {
            component.startImport(entry);
            progress.next({ progress: 0, status: 'initialized' });
            expect(component.forms[entry.label].disabled).toBe(true);
            progress.next({ progress: 1, status: 'running' });
            expect(component.isRunning(entry.path)).toBe(true);
            component.stop(entry);
            component.stop(entry);
            expect(service.stop).toHaveBeenCalledTimes(1);
            expect(service.stop).toHaveBeenCalledWith(entry.path);
            stopping.next({ state: 'stopping', runId: 'run-1' });
            progress.next({ progress: 1, status: 'stopping', stopRequested: true });
            expect(component.forms[entry.label].disabled).toBe(true);
            expect(component.stoppingPaths.has(entry.path)).toBe(true);
            progress.next({ progress: 0, status: 'cancelled' });
            expect(component.isRunning(entry.path)).toBe(false);
            expect(component.forms[entry.label].enabled).toBe(true);
            expect(component.stoppingPaths.has(entry.path)).toBe(false);
            expect(component.isStarting(entry.path)).toBe(true);
            starting.next({});
            starting.complete();
            expect(component.isStarting(entry.path)).toBe(false);
            expect(reports.getReports).toHaveBeenCalledTimes(2);
        });

        it('allows retry after a stop error while keeping the running form locked', () => {
            component.startImport(entry);
            progress.next({ progress: 0.5, status: 'running' });
            service.stop.mockReturnValue(throwError(() => new Error('failed')));
            component.stop(entry);
            expect(component.stoppingPaths.has(entry.path)).toBe(false);
            expect(component.forms[entry.label].disabled).toBe(true);
            component.stop(entry);
            expect(service.stop).toHaveBeenCalledTimes(2);
        });

        it('stops polling when the page is destroyed', () => {
            component.startImport(entry);
            expect(progress.observed).toBe(true);
            component.ngOnDestroy();
            expect(progress.observed).toBe(false);
        });

        it('restores an already stopping run after reloading the page', async () => {
            service.isRunning.mockResolvedValue([entry]);
            await component.ngOnInit();
            expect(component.forms[entry.label].disabled).toBe(true);
            progress.next({ progress: -1, status: 'stopping', stopRequested: true });
            component.stop(entry);
            expect(service.stop).not.toHaveBeenCalled();
            expect(component.stoppingPaths.has(entry.path)).toBe(true);
        });
    });
}
