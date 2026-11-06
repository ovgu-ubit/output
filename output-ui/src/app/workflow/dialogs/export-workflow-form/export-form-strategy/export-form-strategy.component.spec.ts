import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { ExportStrategy, ExportWorkflow } from '@output/interfaces';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { RuntimeConfigService } from 'src/app/services/runtime-config.service';
import { ExportFormFacade } from '../export-form-facade.service';
import { ExportFormStrategyComponent } from './export-form-strategy.component';

describe('Endpoint export strategy editor', () => {
    let fixture: ComponentFixture<ExportFormStrategyComponent>;
    let component: ExportFormStrategyComponent;
    let workflow: BehaviorSubject<ExportWorkflow>;
    let destroy: Subject<void>;
    const errors = { applyFieldErrors: vi.fn(), present: vi.fn() };
    const runtime = { getValue: vi.fn(() => '/api/') };
    let facade: { export$: typeof workflow; destroy$: typeof destroy; patch: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn> };

    beforeEach(async () => {
        vi.clearAllMocks();
        workflow = new BehaviorSubject<ExportWorkflow>({
            id: 7, workflow_id: 'endpoint', label: 'Export', source_entity: 'publication', mapping: '{"title":title}',
        });
        destroy = new Subject();
        facade = {
            export$: workflow, destroy$: destroy,
            patch: vi.fn(patch => workflow.next({ ...workflow.value, ...patch })),
            save: vi.fn(() => of(workflow.value)),
        };
        await TestBed.configureTestingModule({
            imports: [ExportFormStrategyComponent, NoopAnimationsModule],
            providers: [
                { provide: ExportFormFacade, useValue: facade },
                { provide: ErrorPresentationService, useValue: errors },
                { provide: RuntimeConfigService, useValue: runtime },
            ],
        }).compileComponents();
        fixture = TestBed.createComponent(ExportFormStrategyComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    afterEach(() => { destroy.next(); destroy.complete(); });

    const selectEndpoint = (name = 'publications') => {
        component.selectionForm.controls.strategy.setValue(ExportStrategy.ENDPOINT);
        component.strategyForm.controls.endpoint_name.setValue(name);
    };

    it('saves the endpoint name with protected access by default', async () => {
        selectEndpoint();
        expect(await component.persistFormToBackend()).toBe(true);
        expect(facade.patch).toHaveBeenCalledWith({ strategy_type: ExportStrategy.ENDPOINT, strategy: {
            format: 'json', disposition: 'inline', endpoint_name: 'publications', access: 'authenticated',
        } });
        expect(workflow.value.mapping).toBe('{"title":title}');
    });

    it.each(['', 'Test', '1test', 'a/b', 'a'.repeat(101)])('prevents saving invalid name %p', async name => {
        selectEndpoint(name);
        expect(await component.persistFormToBackend()).toBe(false);
        expect(facade.save).not.toHaveBeenCalled();
    });

    it.each(['json', 'xml', 'csv', 'xlsx'])('preserves public endpoint settings for %s', async format => {
        selectEndpoint();
        component.strategyForm.patchValue({ access: 'public', format });
        expect(await component.persistFormToBackend()).toBe(true);
        expect(workflow.value.strategy).toMatchObject({ endpoint_name: 'publications', access: 'public', format });
        if (format === 'xlsx') expect(workflow.value.strategy.disposition).toBe('attachment');
    });

    it('removes endpoint-specific fields when switching back to HTTP response', async () => {
        selectEndpoint();
        component.selectionForm.controls.strategy.setValue(ExportStrategy.HTTP_RESPONSE);
        expect(await component.persistFormToBackend()).toBe(true);
        expect(workflow.value.strategy).toEqual({ format: 'json', disposition: 'inline' });
    });

    it('resets name and access to the saved workflow', () => {
        workflow.next({ ...workflow.value, strategy_type: ExportStrategy.ENDPOINT,
            strategy: { format: 'json', endpoint_name: 'saved', access: 'public' } });
        component.strategyForm.patchValue({ endpoint_name: 'changed', access: 'authenticated' });
        component.strategyForm.markAsDirty();
        component.resetFormToFacade();
        expect(component.strategyForm.getRawValue()).toMatchObject({ endpoint_name: 'saved', access: 'public' });
        expect(component.hasPendingChanges()).toBe(false);
    });

    it('displays the full URL, method, publication state and copyable request example', () => {
        selectEndpoint();
        fixture.detectChanges();
        expect(component.endpointUrl).toBe(new URL('/api/workflow/export/api/publications', document.baseURI).href);
        expect(fixture.nativeElement.textContent).toContain('POST-Endpunkt');
        expect(fixture.nativeElement.textContent).toContain('Entwurf');
        expect(fixture.nativeElement.textContent).toContain('Request-Beispiel kopieren');
        expect(JSON.parse(component.endpointRequestExample)).toEqual({
            filter: { expressions: [{ op: 0, key: 'title', comp: 0, value: 'test' }] }, paths: [],
        });
        workflow.next({ ...workflow.value, strategy_type: ExportStrategy.ENDPOINT, published_at: new Date(),
            strategy: { format: 'json', endpoint_name: 'publications', access: 'public' } });
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('der Endpunkt ist aktiv');
        expect(component.strategyForm.disabled).toBe(true);
        workflow.next({ ...workflow.value, deleted_at: new Date() });
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('nicht erreichbar');
    });

    it('resolves absolute API addresses and retains their base path', () => {
        runtime.getValue.mockReturnValueOnce('https://example.org/output/api');
        selectEndpoint();
        expect(component.endpointUrl).toBe('https://example.org/output/api/workflow/export/api/publications');
    });

    it('prevents the endpoint strategy on non-publication sources', async () => {
        workflow.next({ ...workflow.value, source_entity: 'author' });
        selectEndpoint();
        expect(await component.persistFormToBackend()).toBe(false);
        expect(facade.save).not.toHaveBeenCalled();
    });

    it('presents backend name conflicts as field errors', async () => {
        selectEndpoint();
        const error = { error: { code: 'UNIQUE_CONSTRAINT', details: [{ path: 'strategy.endpoint_name', code: 'unique' }] } };
        facade.save.mockReturnValueOnce(throwError(() => error));
        expect(await component.persistFormToBackend()).toBe(false);
        expect(errors.applyFieldErrors).toHaveBeenCalledWith(component.strategyForm, error, { pathPrefixes: ['strategy.'] });
    });
});
