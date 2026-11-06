import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { generateKeyPairSync } from 'node:crypto';
import { CompareOperation, ExportStrategy, JoinOperation } from '@output/interfaces';
import * as XLSX from 'xlsx';
import { configureApplication } from '../src/application-bootstrap';
import { AccessGuard } from '../src/authorization/access.guard';
import { AUTH_SERVICE } from '../src/authorization/authorization.service';
import { TokenAuthorizationService } from '../src/authorization/token.authorization.service';
import { AppConfigService } from '../src/config/app-config.service';
import { AuthorService } from '../src/author/author.service';
import { ContractService } from '../src/contract/contract.service';
import { FunderService } from '../src/funder/funder.service';
import { GreaterEntityService } from '../src/greater_entity/greater-entitiy.service';
import { InstituteService } from '../src/institute/institute.service';
import { InvoiceService } from '../src/invoice/invoice.service';
import { OACategoryService } from '../src/oa_category/oa-category.service';
import { PublicationFilterService } from '../src/publication/core/publication-filter.service';
import { PublicationService } from '../src/publication/core/publication.service';
import { PublicationTypeService } from '../src/pub_type/publication-type.service';
import { PublisherService } from '../src/publisher/publisher.service';
import { ExportEndpointController } from '../src/workflow/ExportEndpointController';
import { ExportWorkflow } from '../src/workflow/ExportWorkflow.entity';
import { ExportEndpointGuard } from '../src/workflow/export/export-endpoint.guard';
import { ExportEndpointService } from '../src/workflow/export/export-endpoint.service';
import { ExportSourceService } from '../src/workflow/export/export-source.service';
import { JSONataExportService } from '../src/workflow/export/jsonata-export.service';
import { AbstractFilterService, FilterService } from '../src/workflow/filter/abstract-filter.service';
import { MissingInvoiceDataService } from '../src/workflow/filter/missing-invoice-data-filter.service';
import { MissingInstFilterService } from '../src/workflow/filter/missing-inst-filter.service';
import { MissingInstAuthorFilterService } from '../src/workflow/filter/missing-inst-author-filter.service';
import { WorkflowReportService } from '../src/workflow/workflow-report.service';
import { createInvalidRequestHttpException } from '../src/common/api-error';

@FilterService({ path: 'second' })
class SecondPublicationFilter extends AbstractFilterService<any> {
    async filter(items: any[]) { return items.filter(item => item.id === 2); }
    getName() { return 'Second publication'; }
}

describe('Publication export endpoints (HTTP)', () => {
    let app: INestApplication;
    let url: string;
    let jwt: JwtService;
    let privateKey: string;
    let verify: jest.SpyInstance;
    const definitions = new Map<string, ExportWorkflow>();
    const publications = [
        { id: 1, title: 'First', invoices: [{ number: 'invoice-1' }] },
        { id: 2, title: 'Second', invoices: [{ number: 'invoice-2' }] },
    ];
    const reports = new Map<number, any>();
    const source = { load: jest.fn() };
    const repository = { findOne: jest.fn() };
    const publicationRepository = { find: jest.fn() };
    const publicationLookup = new PublicationService(publicationRepository as never,
        {} as never, {} as never, {} as never, {} as never);
    const reporting = {
        createReport: jest.fn(async data => {
            const report = { ...data, id: reports.size + 1 };
            reports.set(report.id, report);
            return report;
        }),
        updateStatus: jest.fn(async (id, data) => {
            const report = { ...reports.get(id), ...data };
            reports.set(id, report);
            return report;
        }),
        write: jest.fn(async () => undefined),
        finish: jest.fn(async (id, data) => { reports.set(id, { ...reports.get(id), ...data }); }),
    };
    const configuration = {
        get: jest.fn(async key => key === 'AUTH' ? 'true' : undefined),
        listDatabaseConfig: jest.fn(async () => [{ key: 'institution', value: 'Test University' }]),
    };

    const define = (name = 'publications', overrides: Partial<ExportWorkflow> = {}) => {
        const workflow: ExportWorkflow = {
            id: definitions.size + 1, workflow_id: name, version: 1, label: 'Publication Export',
            published_at: new Date(), source_entity: 'publication', strategy_type: ExportStrategy.ENDPOINT,
            strategy: { format: 'json', endpoint_name: name, access: 'public' },
            mapping: '{"title":title}', ...overrides,
        };
        definitions.set(name, workflow);
        return workflow;
    };
    const request = (name: string, body?: unknown, cookie?: string) => fetch(`${url}/workflow/export/api/${name}`, {
        method: 'POST', headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const cookieFor = (role: string) => `auth-token=${jwt.sign({ id: 'reader-user', permissions: [{ appname: 'output', rolename: role }] }, { privateKey, algorithm: 'RS256' })}`;

    beforeAll(async () => {
        const keys = generateKeyPairSync('rsa', {
            modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
        });
        privateKey = keys.privateKey;
        const module = await Test.createTestingModule({
            controllers: [ExportEndpointController],
            providers: [
                ExportEndpointService, ExportEndpointGuard, AccessGuard, JSONataExportService,
                PublicationFilterService, JwtService,
                { provide: 'Filters', useValue: [
                    new SecondPublicationFilter(), new MissingInvoiceDataService(publicationLookup),
                    new MissingInstFilterService(publicationLookup), new MissingInstAuthorFilterService(publicationLookup),
                ] },
                { provide: getRepositoryToken(ExportWorkflow), useValue: repository },
                { provide: ExportSourceService, useValue: source },
                { provide: WorkflowReportService, useValue: reporting },
                { provide: AppConfigService, useValue: configuration },
                { provide: AUTH_SERVICE, inject: [Reflector, JwtService], useFactory: (reflector, service) =>
                    new TokenAuthorizationService(reflector, configuration as never, service, {} as never, {
                        isDemoMode: async () => true, getPublicKey: () => keys.publicKey,
                    } as never) },
                ...[AuthorService, ContractService, FunderService, GreaterEntityService, InstituteService,
                    InvoiceService, OACategoryService, PublicationTypeService, PublisherService]
                    .map(provide => ({ provide, useValue: {} })),
            ],
        }).compile();
        jwt = module.get(JwtService);
        verify = jest.spyOn(module.get<TokenAuthorizationService>(AUTH_SERVICE), 'verify');
        app = module.createNestApplication();
        app.useLogger(false);
        configureApplication(app, { basePath: '/api', corsOrigins: [] });
        await app.listen(0, '127.0.0.1');
        url = await app.getUrl();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        publicationRepository.find.mockReset();
        definitions.clear();
        reports.clear();
        repository.findOne.mockImplementation(async ({ where }) => {
            const workflow = definitions.get(where.strategy.objectLiteralParameters.endpointName);
            return workflow?.published_at && !workflow.deleted_at && workflow.strategy_type === where.strategy_type
                && workflow.source_entity === where.source_entity ? workflow : null;
        });
        source.load.mockImplementation(async (_source, filter) => {
            let result = publications;
            for (const expression of filter.expressions) {
                if (expression.key !== 'title') throw createInvalidRequestHttpException('Unsupported filter key.');
                result = result.filter(publication => publication.title.includes(expression.value));
            }
            return result;
        });
        define();
    });

    afterAll(async () => { await app?.close(); });

    it('does not expose endpoint exports under the old export root', async () => {
        const response = await fetch(`${url}/export/api/publications`, { method: 'POST' });
        expect(response.status).toBe(404);
        expect(source.load).not.toHaveBeenCalled();
    });

    it('exports without a body or authentication and logs the run', async () => {
        const response = await request('publications');
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual([{ title: 'First' }, { title: 'Second' }]);
        expect(verify).not.toHaveBeenCalled();
        expect(source.load).toHaveBeenCalledWith('publication', { expressions: [] });
        expect([...reports.values()]).toEqual([expect.objectContaining({ status: 'Successful export', summary: expect.objectContaining({ count_export: 2 }) })]);
    });

    it('applies field filters and named paths before mapping', async () => {
        const filter = { expressions: [{ op: 0, key: 'title', comp: 0, value: 'Second' }] };
        const response = await request('publications', { filter, paths: ['second'] });
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual([{ title: 'Second' }]);
        expect(source.load).toHaveBeenCalledWith('publication', filter);
    });

    it.each([
        { paths: ['missing-invoice'] },
        { paths: ['missing-institute'] },
        { paths: ['missing-inst_auth'] },
        { paths: ['missing-invoice', 'missing-institute'] },
    ])('exports explicitly selected deleted publications through $paths', async ({ paths }) => {
        const filter = { expressions: [{
            op: JoinOperation.AND_NOT, key: 'delete_date', comp: CompareOperation.EQUALS, value: null,
        }] };
        const records = [
            {
                id: 101, title: 'Deleted match', delete_date: new Date('2026-01-01'), invoices: [], contract: null,
                authorPublications: paths.includes('missing-inst_auth') ? [] : [{ corresponding: true, institute: null }],
            },
            {
                id: 102, title: 'Deleted non-match', delete_date: new Date('2026-01-01'), contract: null,
                authorPublications: [{ corresponding: true, institute: { id: 1 } }],
                invoices: paths.length === 1 && paths[0] === 'missing-invoice' ? [{ id: 7 }] : [],
            },
        ];
        source.load.mockResolvedValueOnce(records);
        publicationRepository.find.mockImplementation(async options => {
            const record = records.find(record => record.id === options.where.id);
            return record && (!record.delete_date || options.withDeleted) ? [record] : [];
        });

        const response = await request('publications', { filter, paths });

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual([{ title: 'Deleted match' }]);
        expect(source.load).toHaveBeenCalledWith('publication', filter);
        expect([...reports.values()][0]).toMatchObject({
            status: 'Successful export', summary: { count_export: 1 },
        });
    });

    it.each(['reader', 'writer', 'admin', 'publication_writer'])('authenticates existing %s cookies', async role => {
        define('protected', { strategy: { format: 'json', endpoint_name: 'protected' } });
        const response = await request('protected', {}, cookieFor(role));
        expect(response.status).toBe(200);
        expect(verify).toHaveBeenCalledTimes(1);
        expect([...reports.values()][0].by_user).toBe('reader-user');
    });

    it('rejects unauthenticated and insufficiently authorized requests before loading data', async () => {
        define('protected', { strategy: { format: 'json', endpoint_name: 'protected', access: 'authenticated' } });
        expect((await request('protected')).status).toBe(403);
        expect((await request('protected', {}, cookieFor('guest'))).status).toBe(403);
        expect(source.load).not.toHaveBeenCalled();
        expect(reporting.createReport).not.toHaveBeenCalled();
    });

    it('keeps the full export data and configuration available to public mappings', async () => {
        define('publications', { mapping: '{"invoice":invoices[0].number,"institution":params.cfg.institution}' });
        const response = await request('publications');
        expect(await response.json()).toEqual([
            { invoice: 'invoice-1', institution: 'Test University' },
            { invoice: 'invoice-2', institution: 'Test University' },
        ]);
    });

    it.each(['missing', 'draft', 'archived', 'wrong-source', 'http-response'])('returns 404 for %s', async name => {
        if (name === 'draft') define(name, { published_at: null });
        if (name === 'archived') define(name, { deleted_at: new Date() });
        if (name === 'wrong-source') define(name, { source_entity: 'author' });
        if (name === 'http-response') define(name, { strategy_type: ExportStrategy.HTTP_RESPONSE });
        const response = await request(name);
        expect(response.status).toBe(404);
        expect(await response.json()).toMatchObject({ code: 'NOT_FOUND', correlationId: expect.any(String) });
        expect(source.load).not.toHaveBeenCalled();
    });

    it('picks up publication, archival and replacement versions without a restart', async () => {
        const first = define('versioned', { published_at: null });
        expect((await request('versioned')).status).toBe(404);
        first.published_at = new Date();
        expect((await request('versioned')).status).toBe(200);
        first.deleted_at = new Date();
        expect((await request('versioned')).status).toBe(404);
        define('versioned', { version: 2, mapping: '{"id":id}' });
        const response = await request('versioned');
        expect(response.headers.get('content-disposition')).toContain('_v2_');
        expect(await response.json()).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it.each([[], { filter: {} }, { paths: 'second' }, { mapping: '$' },
        { filter: { expressions: [{ op: 0, key: 'invalid', comp: 0, value: 'test' }] } },
    ])('returns structured 400 errors for invalid requests: %p', async body => {
        const response = await request('publications', body);
        expect(response.status).toBe(400);
        expect(await response.json()).toMatchObject({ statusCode: 400, correlationId: expect.any(String) });
    });

    it('rejects unknown paths and records the failed export', async () => {
        const response = await request('publications', { paths: ['missing'] });
        expect(response.status).toBe(404);
        expect([...reports.values()][0].status).toBe('Error while exporting');
    });

    it.each(['(', '$number(title)'])('returns structured mapping errors for %s and records failure', async mapping => {
        define('publications', { mapping });
        const response = await request('publications');
        expect(response.status).toBe(400);
        expect(await response.json()).toMatchObject({ details: [expect.objectContaining({ path: 'mapping', code: 'jsonata' })] });
        expect([...reports.values()][0].status).toBe('Error while exporting');
    });

    describe.each(['json', 'xml', 'csv', 'xlsx'])('%s responses', format => {
        it.each([false, true])('renders valid output and headers (empty=%s)', async empty => {
            define('formatted', { strategy: {
                format, endpoint_name: 'formatted', access: 'public', disposition: 'attachment',
                ...(format === 'xml' ? { root_name: 'export', item_name: 'item' } : {}),
                ...(format === 'csv' ? { delimiter: ';', quote_char: '"' } : {}),
                ...(format === 'xlsx' ? { sheet_name: 'Publications' } : {}),
            } });
            const response = await request('formatted', empty
                ? { filter: { expressions: [{ op: 0, key: 'title', comp: 0, value: 'absent' }] } } : {});
            expect(response.status).toBe(200);
            expect(response.headers.get('content-disposition')).toMatch(new RegExp(`^attachment; filename="Publication_Export_v1_\\d{8}_\\d{6}\\.${format}"$`));
            if (format === 'xlsx') {
                expect(response.headers.get('content-type')).toContain('spreadsheetml.sheet');
                const workbook = XLSX.read(Buffer.from(await response.arrayBuffer()), { type: 'buffer' });
                expect(XLSX.utils.sheet_to_json(workbook.Sheets.Publications)).toEqual(empty ? [] : [{ title: 'First' }, { title: 'Second' }]);
            } else if (format === 'json') {
                expect(response.headers.get('content-type')).toContain('application/json');
                expect(await response.json()).toEqual(empty ? [] : [{ title: 'First' }, { title: 'Second' }]);
            } else {
                expect(response.headers.get('content-type')).toContain(format === 'xml' ? 'application/xml' : 'text/csv');
                const text = await response.text();
                if (!empty) expect(text).toContain('First');
                if (format === 'xml') expect(text).toContain('<export');
                if (format === 'csv' && empty) expect(text).toBe('');
            }
        });
    });

    it('isolates mappings and reports for overlapping requests', async () => {
        define('first', { id: 10, mapping: '{"first":title}' });
        define('second', { id: 20, mapping: '{"second":id}' });
        const waiting: ((value: any) => void)[] = [];
        source.load.mockImplementation(() => new Promise(resolve => {
            waiting.push(resolve);
            if (waiting.length === 2) waiting.forEach(release => release(publications));
        }));
        const responses = await Promise.all([request('first'), request('second')]);
        expect(await responses[0].json()).toEqual([{ first: 'First' }, { first: 'Second' }]);
        expect(await responses[1].json()).toEqual([{ second: 1 }, { second: 2 }]);
        expect([...reports.values()].map(report => report.workflow.id).sort()).toEqual([10, 20]);
        expect([...reports.values()].every(report => report.status === 'Successful export')).toBe(true);
        expect(new Set(reporting.finish.mock.calls.map(([id]) => id)).size).toBe(2);
    });
});
