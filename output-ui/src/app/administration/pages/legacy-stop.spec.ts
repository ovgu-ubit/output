import { FormBuilder } from '@angular/forms';
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
    let service: jasmine.SpyObj<any>;
    let reports: jasmine.SpyObj<any>;
    const entry = { path: kind === 'enrich' || kind === 'import' ? 'crossref' : kind, label: 'Test' };

    beforeEach(async () => {
      progress = new Subject(); starting = new Subject(); stopping = new Subject();
      service = jasmine.createSpyObj('LegacyService', ['getImports', 'getEnrichs', 'getStatus', 'isRunning', 'getProgress', 'start', 'startYear', 'startCSV', 'startExcel', 'stop']);
      service.getImports.and.returnValue(of([entry]));
      service.getEnrichs.and.returnValue(of([entry]));
      service.getStatus.and.returnValue(Promise.resolve([]));
      service.isRunning.and.returnValue(Promise.resolve([]));
      service.getProgress.and.returnValue(progress);
      for (const method of ['start', 'startYear', 'startCSV', 'startExcel']) service[method].and.returnValue(starting);
      service.stop.and.returnValue(stopping);
      reports = jasmine.createSpyObj('ReportService', ['getReports']);
      reports.getReports.and.returnValue(of(['old.log']));
      const snackBar = jasmine.createSpyObj('MatSnackBar', ['open']);
      component = kind === 'enrich'
        ? new EnrichComponent(reports, service, new FormBuilder(), {} as never, snackBar)
        : new ImportComponent(reports, service, new FormBuilder(), {} as never, snackBar);
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
      expect(component.forms[entry.label].disabled).toBeTrue();
      progress.next({ progress: 1, status: 'running' });
      expect(component.isRunning(entry.path)).toBeTrue();
      component.stop(entry);
      component.stop(entry);
      expect(service.stop).toHaveBeenCalledOnceWith(entry.path);
      stopping.next({ state: 'stopping', runId: 'run-1' });
      progress.next({ progress: 1, status: 'stopping', stopRequested: true });
      expect(component.forms[entry.label].disabled).toBeTrue();
      expect(component.stoppingPaths.has(entry.path)).toBeTrue();
      progress.next({ progress: 0, status: 'cancelled' });
      expect(component.isRunning(entry.path)).toBeFalse();
      expect(component.forms[entry.label].enabled).toBeTrue();
      expect(component.stoppingPaths.has(entry.path)).toBeFalse();
      expect(component.isStarting(entry.path)).toBeTrue();
      starting.next({}); starting.complete();
      expect(component.isStarting(entry.path)).toBeFalse();
      expect(reports.getReports).toHaveBeenCalledTimes(2);
    });

    it('allows retry after a stop error while keeping the running form locked', () => {
      component.startImport(entry);
      progress.next({ progress: 0.5, status: 'running' });
      service.stop.and.returnValue(throwError(() => new Error('failed')));
      component.stop(entry);
      expect(component.stoppingPaths.has(entry.path)).toBeFalse();
      expect(component.forms[entry.label].disabled).toBeTrue();
      component.stop(entry);
      expect(service.stop).toHaveBeenCalledTimes(2);
    });

    it('stops polling when the page is destroyed', () => {
      component.startImport(entry);
      expect(progress.observed).toBeTrue();
      component.ngOnDestroy();
      expect(progress.observed).toBeFalse();
    });

    it('restores an already stopping run after reloading the page', async () => {
      service.isRunning.and.returnValue(Promise.resolve([entry]));
      await component.ngOnInit();
      expect(component.forms[entry.label].disabled).toBeTrue();
      progress.next({ progress: -1, status: 'stopping', stopRequested: true });
      component.stop(entry);
      expect(service.stop).not.toHaveBeenCalled();
      expect(component.stoppingPaths.has(entry.path)).toBeTrue();
    });
  });
}
