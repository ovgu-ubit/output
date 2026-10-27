import { Observable, of, Subject, throwError, timer, concatMap, firstValueFrom } from 'rxjs';
import * as XLSX from 'xlsx';
import { ImportExecutionService } from './import-execution.service';
import { AbstractImportService } from './import/abstract-import';
import { CSVImportService } from './import/csv-import.service';
import { ExcelImportService } from './import/excel-import.service';
import { ApiImportOffsetService } from './import/api-import-offset.service';
import { ApiImportCursorService } from './import/api-import-cursor.service';
import { ApiEnrichDOIService } from './import/api-enrich-doi.service';
import { DOAJEnrichService } from './import/doaj-enrich.service';
import { PubMedImportService } from './import/pubmed-import';
import { JSONataImportService } from './import/jsonata-import';

const deferred = () => {
    let resolve!: () => void;
    const promise = new Promise<void>(done => { resolve = done; });
    return { promise, resolve };
};
const flush = () => new Promise<void>(resolve => setImmediate(resolve));

// Exercise the real shared lifecycle without unrelated domain dependencies.
const participant = (prototype = AbstractImportService.prototype) => Object.assign(Object.create(prototype), {
    parallelCalls: 2,
    reportService: { createReport: jest.fn(async () => 'import.log'), write: jest.fn(), finish: jest.fn() },
    workflowReportService: {
        updateStatus: jest.fn(async (id, content) => ({ id, ...content })),
        finish: jest.fn(async (id, content) => ({ id, ...content })),
        write: jest.fn(async () => undefined),
    },
});

describe('Import execution cancellation', () => {
    let executions: ImportExecutionService;
    beforeEach(() => { executions = new ImportExecutionService(); });
    afterEach(() => jest.useRealTimers());

    it('reserves before preparation and keeps the reservation until preparation returns', async () => {
        const service = participant();
        const prepare = deferred();
        const start = executions.run('import', { kind: 'import', path: 'csv' }, service, async () => {
            await prepare.promise;
            service.execution.signal.throwIfAborted();
        });
        const run = executions.get('import')!;
        expect(executions.requestStop('import', 'user', 'alice')).toEqual({ state: 'stopping', runId: run.runId });
        expect(executions.requestStop('import')).toEqual({ state: 'stopping', runId: run.runId });
        await expect(executions.run('import', { kind: 'import', path: 'csv' }, service, async () => undefined))
            .rejects.toMatchObject({ status: 409 });
        expect(service.status()).toMatchObject({ status: 'stopping', stopRequested: true });
        prepare.resolve();
        await start;
        await run.completion;
        expect(service.status()).toEqual({ progress: 0, status: 'cancelled', stopRequested: false });
        expect(executions.requestStop('import')).toEqual({ state: 'not-running' });
        await executions.run('import', { kind: 'import', path: 'csv' }, service, async () => undefined);
    });

    it('drains parallel records, discards queued records and cannot overwrite cancellation with success', async () => {
        const service = participant();
        const source = new Subject<number>();
        const gates = [deferred(), deferred()];
        const begun: number[] = [];
        await executions.run('import', { workflowId: 12 }, service, async () => {
            service.workflowReport = { id: 71 };
            service.subscribeImport(source, { next: async (value: number) => {
                begun.push(value);
                await gates[value - 1].promise;
                service.newPublications.push({ id: value });
                service.deferRunFinish({ status: 'Successfull import' });
            } });
        });
        const run = executions.get('import')!;
        source.next(1); source.next(2); source.next(3);
        await flush();
        expect(begun).toEqual([1, 2]);
        executions.requestStop('import', 'user', 'alice');
        source.next(4);
        expect(service.status().progress).not.toBe(0);
        gates[0].resolve();
        await flush();
        expect(executions.get('import')).toBe(run);
        expect(service.workflowReportService.finish).not.toHaveBeenCalled();
        gates[1].resolve();
        await run.completion;
        expect(begun).toEqual([1, 2]);
        expect(service.workflowReportService.finish).toHaveBeenCalledTimes(1);
        expect(service.workflowReportService.finish).toHaveBeenCalledWith(71, expect.objectContaining({ status: 'cancelled', count_import: 2 }));
        expect(service.workflowReportService.write).toHaveBeenCalledWith(71, expect.objectContaining({
            code: 'import-stop', message: expect.stringContaining('alice (user)'),
        }));
    });

    it('passes the signal to initial HTTP requests and treats abort as cancellation', async () => {
        const service = participant();
        const teardown = jest.fn();
        const http = { get: jest.fn((_url, config) => new Observable(subscriber => {
            const abort = () => subscriber.error(config.signal.reason);
            config.signal.addEventListener('abort', abort, { once: true });
            return () => { config.signal.removeEventListener('abort', abort); teardown(); };
        })) };
        const start = executions.run('import', { workflowId: 1 }, service, async () => {
            await firstValueFrom(service.getImportRequest(http, '/count', { timeout: 1000 }));
        });
        const run = executions.get('import')!;
        expect(http.get).toHaveBeenCalledWith('/count', { timeout: 1000, signal: run.signal });
        executions.requestStop('import');
        await start;
        expect(teardown).toHaveBeenCalledTimes(1);
        expect(service.status().status).toBe('cancelled');
        expect(service.reportService.write).not.toHaveBeenCalled();
    });

    it('cancels delayed requests before their HTTP call starts', async () => {
        jest.useFakeTimers();
        const service = participant();
        const http = { get: jest.fn(() => of({ data: {} })) };
        await executions.run('import', { workflowId: 1 }, service, async () => {
            service.subscribeImport(timer(500).pipe(concatMap(() => service.getImportRequest(http, '/items'))), { next: jest.fn() });
        });
        const run = executions.get('import')!;
        executions.requestStop('import');
        await run.completion;
        await jest.advanceTimersByTimeAsync(1000);
        expect(http.get).not.toHaveBeenCalled();
    });

    it('logs cancellation requested during preparation after the report becomes available', async () => {
        const service = participant();
        const prepared = deferred();
        const start = executions.run('import', { workflowId: 1 }, service, async () => {
            await prepared.promise;
            service.workflowReport = { id: 71 };
        });
        const run = executions.get('import')!;
        executions.requestStop('import', 'user', 'alice');
        prepared.resolve();
        await start;
        await run.completion;
        expect(service.workflowReportService.write).toHaveBeenCalledTimes(1);
        expect(service.workflowReportService.finish).toHaveBeenCalledWith(71, expect.objectContaining({ status: 'cancelled' }));
    });

    it('releases a failed preparation and preserves the original error', async () => {
        const service = participant();
        const error = new Error('Setup failed');
        await expect(executions.run('import', { workflowId: 1 }, service, async () => { throw error; })).rejects.toBe(error);
        expect(executions.get('import')).toBeUndefined();
        expect(service.status()).toMatchObject({ progress: 0, status: 'Error while importing' });
    });

    it('stops JSONata file processing between records', async () => {
        const service = participant(JSONataImportService.prototype);
        const gate = deferred();
        service.importDefinition = { strategy: { format: 'csv', delimiter: ',', skip_first_line: true } };
        service.transform = async item => item;
        service.getDOI = () => undefined;
        service.getTitle = item => item.title;
        service.publicationIndexService = { checkDOIorTitleAlreadyExists: async () => false };
        service.mapNew = jest.fn(async item => { await gate.promise; return item; });
        const file = { originalname: 'test.csv', buffer: Buffer.from('title\nOne\nTwo') };
        const start = executions.run('import', { workflowId: 1 }, service, async () => {
            service.workflowReport = { id: 71, params: {} };
            await service.loadFile(false, file, 'alice', true);
        });
        await flush();
        const run = executions.get('import')!;
        expect(service.mapNew).toHaveBeenCalledTimes(1);
        executions.requestStop('import');
        gate.resolve();
        await start;
        await run.completion;
        expect(service.mapNew).toHaveBeenCalledTimes(1);
        expect(service.workflowReportService.finish).toHaveBeenCalledWith(71, expect.objectContaining({ status: 'cancelled', count_import: 1 }));
    });

    it('uses watchdog cancellation without releasing a still-busy service', async () => {
        jest.useFakeTimers();
        const service = participant();
        const record = deferred();
        await executions.run('import', { workflowId: 1 }, service, async () => {
            service.execution.track(record.promise);
        }, async () => 60_000);
        const run = executions.get('import')!;
        await jest.advanceTimersByTimeAsync(60_000);
        expect(run.stop?.reason).toBe('watchdog');
        expect(executions.get('import')).toBe(run);
        record.resolve();
        await run.completion;
        expect(executions.get('import')).toBeUndefined();
    });

    it.each([false, true])('finalizes empty and failed streams (failure=%s)', async failure => {
        const service = participant();
        await executions.run('import', { kind: 'enrich', path: 'crossref' }, service, async () => {
            service.report = 'enrich.log';
            service.subscribeImport(failure ? throwError(() => new Error('network failed')) : of(), { error: jest.fn() });
        });
        const run = executions.get('import');
        await run?.completion;
        expect(service.reportService.finish).toHaveBeenCalledTimes(1);
        expect(service.status().status).toBe(failure ? 'Error while enriching' : 'Successfull enrich');
    });

    it('isolates different import and enrich paths', async () => {
        const a = participant(); const b = participant();
        const gates = [deferred(), deferred()];
        await executions.run('legacy-import:crossref', { kind: 'import', path: 'crossref' }, a, async () => a.execution.track(gates[0].promise));
        await executions.run('legacy-enrich:crossref', { kind: 'enrich', path: 'crossref' }, b, async () => b.execution.track(gates[1].promise));
        const runs = [executions.get('legacy-import:crossref')!, executions.get('legacy-enrich:crossref')!];
        executions.requestStop('legacy-import:crossref');
        expect(runs[1].signal.aborted).toBe(false);
        gates.forEach(gate => gate.resolve());
        await Promise.all(runs.map(run => run.completion));
    });

    it.each([
        ['offset', ApiImportOffsetService.prototype, 'import'],
        ['cursor', ApiImportCursorService.prototype, 'import'],
        ['pubmed', PubMedImportService.prototype, 'import'],
        ['doi', ApiEnrichDOIService.prototype, 'import'],
        ['doaj', DOAJEnrichService.prototype, 'import'],
        ['jsonata-offset', JSONataImportService.prototype, 'import'],
        ['jsonata-lookup', JSONataImportService.prototype, 'importLookupAndRetrieve'],
        ['jsonata-doi', JSONataImportService.prototype, 'enrich'],
    ])('cancels actual %s requests and tears down subscriptions', async (name, prototype, method) => {
        const service = participant(prototype as AbstractImportService);
        const teardown = jest.fn();
        const requested = deferred();
        service.http = { get: jest.fn((_url, config) => new Observable(subscriber => {
            requested.resolve();
            const abort = () => subscriber.error(config.signal.reason);
            config.signal.addEventListener('abort', abort, { once: true });
            return () => { config.signal.removeEventListener('abort', abort); teardown(); };
        })) };
        Object.assign(service, {
            init: async () => undefined, url: '/items', url_count: '/count', url_doi: '/doi/[doi]',
            lookupURL: '/lookup', retrieveURL: '/retrieve', url_search: '/search',
            max_res: 20, max: 20, offset_count: 0, offset_start: 0, mode: 'offset', params: [], delayInMs: 0,
            configService: { get: async () => ['test'] },
            publicationService: { get: async () => [{ doi: '10.123/test', greater_entity: { id: 1, identifiers: [{ type: 'issn', value: '1234' }] } }] },
            publicationIndexService: { isDOIvalid: () => true },
            importDefinition: { strategy: { get_count: '$.count', get_items: '$.items', get_lookup_ids: '$.ids', get_retrieve_item: '$', get_doi_item: '$' } },
            getSafeUrl: async (url: string) => url,
        });
        const start = executions.run(name as string, { workflowId: 1 }, service, async () => {
            if ((name as string).startsWith('jsonata')) service.workflowReport = { id: 71, params: {} };
            return method === 'enrich' ? service.enrich('alice', true) : service[method as string](false, 'alice', true);
        });
        await requested.promise;
        const run = executions.get(name as string)!;
        expect(service.http.get).toHaveBeenCalled();
        expect(service.http.get.mock.calls[0][1].signal).toBe(run.signal);
        executions.requestStop(name as string, 'user', 'alice');
        await start;
        await run.completion;
        expect(teardown).toHaveBeenCalledTimes(1);
        expect(service.status()).toMatchObject({ progress: 0, status: 'cancelled', stopRequested: false });
        expect(service.workflowReportService.write.mock.calls.some(([, item]) => item.level === 'error')).toBe(false);
        expect(service.reportService.write.mock.calls.some(([, item]) => item.type === 'error')).toBe(false);
    });

    it.each(['csv', 'xls'])('stops the actual %s loop between records and preserves the completed record', async format => {
        const service = participant(format === 'csv' ? CSVImportService.prototype : ExcelImportService.prototype);
        const gate = deferred();
        service.importConfig = { delimiter: ',', header: true, encoding: 'utf-8', name: 'test' };
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ title: 'One' }, { title: 'Two' }]), 'Data');
        service.file = { buffer: format === 'csv' ? Buffer.from('title\nOne\nTwo') : XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) };
        service.checkFormat = () => true;
        service.getDOI = () => undefined;
        service.getTitle = (item: { title: string }) => item.title;
        service.publicationIndexService = { checkDOIorTitleAlreadyExists: jest.fn(async () => false) };
        service.mapNew = jest.fn(async item => { await gate.promise; return item; });
        const start = executions.run(format, { kind: 'import', path: format }, service, () => service.import(false, 'alice', true));
        await flush();
        expect(service.mapNew).toHaveBeenCalledTimes(1);
        const run = executions.get(format)!;
        executions.requestStop(format, 'user', 'alice');
        gate.resolve();
        await start;
        await run.completion;
        expect(service.mapNew).toHaveBeenCalledTimes(1);
        expect(service.dryRun).toBe(true);
        expect(service.reportService.finish).toHaveBeenCalledWith('import.log', { status: 'cancelled', count_import: 1, count_update: 0 });
    });
});
