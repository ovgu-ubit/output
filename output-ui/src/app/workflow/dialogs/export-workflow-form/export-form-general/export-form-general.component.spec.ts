import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatSelectHarness } from '@angular/material/select/testing';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { ExportWorkflow } from '@output/interfaces';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { ExportFormFacade } from '../export-form-facade.service';
import { ExportFormMappingComponent } from '../export-form-mapping/export-form-mapping.component';
import { ExportFormGeneralComponent } from './export-form-general.component';

describe('Export workflow entity selection', () => {
  let component: ExportFormGeneralComponent;
  let fixture: ComponentFixture<ExportFormGeneralComponent>;
  let workflow: BehaviorSubject<ExportWorkflow>;
  let destroy: Subject<void>;
  let facade: { export$: typeof workflow; destroy$: typeof destroy; patch: jasmine.Spy; save: jasmine.Spy };

  beforeEach(async () => {
    workflow = new BehaviorSubject<ExportWorkflow>({ id: 7, label: 'Export', mapping: '{ "id": id }' });
    destroy = new Subject();
    facade = {
      export$: workflow, destroy$: destroy,
      patch: jasmine.createSpy('patch').and.callFake(patch => workflow.next({ ...workflow.value, ...patch })),
      save: jasmine.createSpy('save').and.callFake(() => of(workflow.value)),
    };
    await TestBed.configureTestingModule({
      imports: [ExportFormGeneralComponent, ExportFormMappingComponent, NoopAnimationsModule],
      providers: [
        { provide: ExportFormFacade, useValue: facade },
        { provide: ErrorPresentationService, useValue: jasmine.createSpyObj('errors', ['applyFieldErrors', 'present']) },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ExportFormGeneralComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => { destroy.next(); destroy.complete(); });

  it('defaults old workflows to publications and offers all eleven classes', async () => {
    const select = await TestbedHarnessEnvironment.loader(fixture).getHarness(MatSelectHarness);
    expect(await select.getValueText()).toBe('Publikationen');
    await select.open();
    expect((await select.getOptions()).length).toBe(11);
  });

  it('saves the selected class, retains the mapping and shows an adaptation hint', async () => {
    const select = await TestbedHarnessEnvironment.loader(fixture).getHarness(MatSelectHarness);
    await select.clickOptions({ text: 'Personen' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('bitte passen Sie es an die neue Quelle an');
    expect(workflow.value.mapping).toBe('{ "id": id }');

    expect(await component.persistFormToBackend()).toBeTrue();
    expect(facade.patch).toHaveBeenCalledWith(jasmine.objectContaining({ source_entity: 'author' }));
    expect(workflow.value.source_entity).toBe('author');
    expect(component.hasPendingChanges()).toBeFalse();
  });

  it('resets the class to the saved selection', () => {
    workflow.next({ ...workflow.value, source_entity: 'contract' });
    component.form.controls['source_entity'].setValue('author');
    component.form.markAsDirty();
    component.resetFormToFacade();
    expect(component.form.controls['source_entity'].value).toBe('contract');
    expect(component.hasPendingChanges()).toBeFalse();
  });

  for (const state of ['published_at', 'deleted_at']) {
    it(`disables selection for ${state}`, async () => {
      workflow.next({ ...workflow.value, [state]: new Date(), source_entity: 'author' });
      fixture.detectChanges();
      const select = await TestbedHarnessEnvironment.loader(fixture).getHarness(MatSelectHarness);
      expect(await select.isDisabled()).toBeTrue();
    });
  }

  it('shows source-specific mapping help without changing the expression', () => {
    workflow.next({ ...workflow.value, source_entity: 'contract' });
    const mapping = TestBed.createComponent(ExportFormMappingComponent);
    mapping.detectChanges();
    expect(mapping.nativeElement.textContent).toContain('Entitätsklasse: Verträge');
    expect(mapping.nativeElement.textContent).toContain('linked_invoices');
    expect(mapping.componentInstance.form.controls['mapping'].value).toBe('{ "id": id }');
    mapping.destroy();
  });
});

describe('ExportFormFacade source defaults', () => {
  it('starts new workflows with publications and retains the class on saves', async () => {
    const api = { add: jasmine.createSpy('add').and.callFake(workflow => of({ ...workflow, id: 7 })) };
    const facade = new ExportFormFacade(api as never);
    expect(facade.createNew().source_entity).toBe('publication');
    facade.patch({ source_entity: 'author' });
    facade.save().subscribe(saved => expect(saved?.source_entity).toBe('author'));
    expect(api.add).toHaveBeenCalledWith(jasmine.objectContaining({ source_entity: 'author' }));
    facade.destroy();
  });
});
