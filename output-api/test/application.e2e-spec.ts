import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SchedulerRegistry } from '@nestjs/schedule';
import { getDataSourceToken } from '@nestjs/typeorm';
import { ApiErrorCode } from '@output/interfaces';

// Exercise both the development sources and the CommonJS files shipped in production.
describe.each(['src', 'dist/src'])('Nest 12 HTTP compatibility (%s)', directory => {
    const load = (file: string) => require(`../${directory}/${file}`);
    const { configureApplication, initializeApplication } = load('application-bootstrap');
    const { AppConfigService } = load('config/app-config.service');
    const { DemoResetService } = load('demo-reset/demo-reset.service');
    const { AUTH_SERVICE } = load('authorization/authorization.service');
    const { CSVImportService } = load('workflow/import/csv-import.service');
    const { InvoiceIndexService } = load('invoice/invoice-index.service');

    let app: INestApplication;
    let baseUrl: string;
    let authCookie: string;
    const events: string[] = [];
    const values: Record<string, unknown> = {
        AUTH: 'true',
        AUTH_SERVICE_PATH: 'authorization/token.authorization.service',
        AUTH_SERVICE_EXPORT: 'TokenAuthorizationService',
        DEMO_MODE: false,
        DEMO_USER: 'migration-user',
        DEMO_PW: 'migration-test-password',
        APP_SSL: 'false',
    };
    const configuration = {
        get: jest.fn(async (key: string) => values[key]),
        reconcileDefaults: jest.fn(async () => {
            await Promise.resolve();
            events.push('configuration-reconciled');
        }),
        normalizeAtomicArrayValues: jest.fn(async () => {
            await Promise.resolve();
            events.push('configuration-normalized');
        }),
    };
    const dataSource = {
        isInitialized: true,
        options: { type: 'postgres' },
        entityMetadatas: [],
        manager: { getTreeRepository: jest.fn(() => ({})) },
        getRepository: jest.fn(() => ({})),
        initialize: jest.fn(),
        query: jest.fn(),
        createQueryRunner: jest.fn(),
        destroy: jest.fn().mockResolvedValue(undefined),
    };
    const csv = {
        bindExecution: jest.fn(),
        finalizeExecution: jest.fn().mockResolvedValue(undefined),
        notifyStop: jest.fn().mockResolvedValue(undefined),
        setUp: jest.fn().mockResolvedValue(undefined),
        import: jest.fn().mockResolvedValue({ imported: 1 }),
    };
    const invoices = {
        index: jest.fn().mockResolvedValue({ items: [], total: 0 }),
    };

    const request = (path: string, options?: RequestInit) => fetch(`${baseUrl}${path}`, options);
    const login = (body: BodyInit, contentType: string) => request('/auth/login', {
        method: 'POST',
        headers: { 'content-type': contentType },
        body,
    });
    const expectApiError = async (response: Response, status: number, code: ApiErrorCode) => {
        expect(response.status).toBe(status);
        const payload = await response.json();
        expect(payload).toMatchObject({
            statusCode: status,
            code,
            message: expect.any(String),
            correlationId: expect.any(String),
            timestamp: expect.any(String),
            path: expect.any(String),
        });
        expect(response.headers.get('x-correlation-id')).toBe(payload.correlationId);
        expect(Number.isNaN(Date.parse(payload.timestamp))).toBe(false);
        return payload;
    };

    beforeAll(async () => {
        const { AppModule } = load('app.module');
        const module = await Test.createTestingModule({ imports: [AppModule] })
            .overrideProvider(getDataSourceToken()).useValue(dataSource)
            .overrideProvider(AppConfigService).useValue(configuration)
            .overrideProvider(CSVImportService).useValue(csv)
            .overrideProvider(InvoiceIndexService).useValue(invoices)
            .compile();
        app = module.createNestApplication();
        app.useLogger(false);
        configureApplication(app, { basePath: '/api', corsOrigins: ['http://localhost:4200/'] });

        const reset = app.get(DemoResetService);
        const resetOnStartup = reset.resetOnStartup.bind(reset);
        jest.spyOn(reset, 'resetOnStartup').mockImplementation(async () => {
            expect(events).toEqual(['configuration-reconciled', 'configuration-normalized']);
            expect(app.get(SchedulerRegistry).getCronJobs().size).toBe(2);
            events.push('demo-reset');
            await resetOnStartup();
        });
        await initializeApplication(app);
        await app.listen(0, '127.0.0.1');
        events.push('listening');
        baseUrl = await app.getUrl();

        values.DEMO_MODE = true;
        const response = await login(JSON.stringify({
            username: values.DEMO_USER,
            password: values.DEMO_PW,
        }), 'application/json');
        expect(response.status).toBe(201);
        authCookie = response.headers.getSetCookie().find(cookie => cookie.startsWith('auth-token='))!.split(';')[0];
        await response.json();
    });

    afterAll(async () => {
        if (!app) return;
        const jobs = [...app.get(SchedulerRegistry).getCronJobs().values()];
        await app.close();
        expect(jobs.every(job => !job.isActive)).toBe(true);
        expect(dataSource.destroy).toHaveBeenCalled();
    });

    it('initializes configuration and schedules before the demo reset and HTTP listener', () => {
        expect(events).toEqual(['configuration-reconciled', 'configuration-normalized', 'demo-reset', 'listening']);
        expect(app.get(AUTH_SERVICE).constructor.name).toBe('TokenAuthorizationService');
        expect([...app.get(SchedulerRegistry).getCronJobs().values()].every(job => job.isActive)).toBe(true);
        expect(dataSource.initialize).not.toHaveBeenCalled();
        expect(dataSource.query).not.toHaveBeenCalled();
        expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('preserves JSON login cookies and authorizes subsequent requests with the real RSA token', async () => {
        const response = await login(JSON.stringify({ username: values.DEMO_USER, password: values.DEMO_PW }), 'application/json');
        const cookies = response.headers.getSetCookie();
        expect(response.status).toBe(201);
        expect(cookies).toEqual(expect.arrayContaining([
            expect.stringMatching(/^auth-token=.*HttpOnly.*SameSite=Lax/),
            expect.stringMatching(/^auth-details=.*SameSite=Lax/),
        ]));
        expect(await response.json()).toMatchObject({ id: 'migration-user' });
        const authenticated = await request('/invoice/index', { headers: { cookie: authCookie } });
        expect(authenticated.status).toBe(200);
        await authenticated.json();
    });

    it('accepts URL-encoded login bodies', async () => {
        const response = await login(new URLSearchParams({ username: String(values.DEMO_USER), password: String(values.DEMO_PW) }), 'application/x-www-form-urlencoded');
        expect(response.status).toBe(201);
        expect(await response.json()).toMatchObject({ id: 'migration-user' });
    });

    it('keeps validation details and the caller correlation ID', async () => {
        const response = await request('/auth/login', {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-correlation-id': 'migration-validation' },
            body: JSON.stringify({ username: 42 }),
        });
        const payload = await expectApiError(response, 400, ApiErrorCode.VALIDATION_FAILED);
        expect(payload.correlationId).toBe('migration-validation');
        expect(payload.details).toEqual(expect.arrayContaining([
            expect.objectContaining({ path: 'username', code: 'isString' }),
            expect.objectContaining({ path: 'password', code: 'isString' }),
        ]));
    });

    it('keeps framework guard errors in the API envelope', async () => {
        await expectApiError(await request('/invoice/index'), 403, ApiErrorCode.FORBIDDEN);
    });

    it('preserves unauthorized login errors', async () => {
        await expectApiError(await login(JSON.stringify({ username: values.DEMO_USER, password: 'incorrect' }), 'application/json'), 401, ApiErrorCode.UNAUTHENTICATED);
    });

    it('transforms invoice query parameters and keeps local validation rules', async () => {
        const response = await request('/invoice/index?page=2&page_size=10&invoice_date_missing=false', { headers: { cookie: authCookie } });
        expect(response.status).toBe(200);
        await response.json();
        expect(invoices.index).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, page_size: 10, invoice_date_missing: false }));

        const invalid = await expectApiError(await request('/invoice/index?page=-1', { headers: { cookie: authCookie } }), 400, ApiErrorCode.VALIDATION_FAILED);
        expect(invalid.details).toContainEqual(expect.objectContaining({ path: 'page', code: 'min' }));
    });

    it('passes multipart file buffers, boolean fields and the authenticated user to CSV imports', async () => {
        const form = new FormData();
        form.set('file', new Blob(['title,doi\nTest,10.123/test'], { type: 'text/csv' }), 'publications.csv');
        form.set('update', 'false');
        form.set('dry_run', 'true');
        form.set('format', '{}');
        const response = await request('/import/csv', { method: 'POST', headers: { cookie: authCookie }, body: form });
        expect(response.status).toBe(201);
        expect(await response.json()).toEqual({ imported: 1 });
        expect(csv.setUp).toHaveBeenLastCalledWith(expect.objectContaining({ originalname: 'publications.csv', buffer: expect.any(Buffer) }), '{}');
        expect(csv.import).toHaveBeenLastCalledWith(false, 'migration-user', true);
    });

    it.each(['wrong-extension', 'unexpected-field'])('normalizes multipart errors (%s)', async kind => {
        const form = new FormData();
        form.set(kind === 'unexpected-field' ? 'other' : 'file', new Blob(['invalid']), kind === 'wrong-extension' ? 'import.txt' : 'import.csv');
        await expectApiError(await request('/import/csv', { method: 'POST', headers: { cookie: authCookie }, body: form }), 400, ApiErrorCode.INVALID_REQUEST);
    });

    it('normalizes malformed JSON through the exception filter', async () => {
        await expectApiError(await login('{invalid', 'application/json'), 400, ApiErrorCode.INVALID_REQUEST);
    });

    it('preserves the 1 MB JSON limit and HTTP 413 instead of returning an internal error', async () => {
        await expectApiError(await login(JSON.stringify({ padding: 'x'.repeat(1024 * 1024) }), 'application/json'), 413, ApiErrorCode.INVALID_REQUEST);
    });

    it('preserves credentialed CORS preflights and normalizes configured trailing slashes', async () => {
        const response = await request('/invoice/index', {
            method: 'OPTIONS',
            headers: { origin: 'http://localhost:4200', 'access-control-request-method': 'GET', 'access-control-request-headers': 'content-type,authorization' },
        });
        expect(response.status).toBe(204);
        expect(response.headers.get('access-control-allow-origin')).toBe('http://localhost:4200');
        expect(response.headers.get('access-control-allow-credentials')).toBe('true');
        expect(response.headers.get('access-control-allow-headers')?.toLowerCase().split(',').map(header => header.trim())).toEqual(['content-type', 'authorization']);
    });

    it('does not allow credentials from an unknown origin', async () => {
        const response = await request('/auth/publickey', { headers: { origin: 'https://untrusted.example' } });
        expect(response.headers.get('access-control-allow-origin')).toBeNull();
        await response.text();
    });

    it('generates Swagger documentation for the actual controllers and DTOs', async () => {
        const response = await request('/swagger-json');
        expect(response.status).toBe(200);
        const document = await response.json();
        expect(document.servers).toContainEqual({ url: '/api' });
        expect(document.paths['/auth/login'].post).toBeDefined();
        expect(document.paths['/import/csv'].post.requestBody.content['multipart/form-data']).toBeDefined();
        expect(document.paths['/invoice/index'].get.parameters).toContainEqual(expect.objectContaining({ name: 'page_size' }));
    });

    it('normalizes not-found errors and generates a correlation ID', async () => {
        const payload = await expectApiError(await request('/does-not-exist'), 404, ApiErrorCode.NOT_FOUND);
        expect(payload.path).toBe('/does-not-exist');
        expect(payload.correlationId).toMatch(/^[\da-f-]{36}$/i);
    });

    it('does not expose internal service errors', async () => {
        invoices.index.mockRejectedValueOnce(new Error('private database details'));
        const payload = await expectApiError(await request('/invoice/index', { headers: { cookie: authCookie } }), 500, ApiErrorCode.INTERNAL_ERROR);
        expect(JSON.stringify(payload)).not.toContain('private database details');
    });
});
