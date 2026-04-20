import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, Subject } from 'rxjs';
import { ImportWorkflow } from '../../../../../../../output-interfaces/Workflow';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { ImportFormFacade } from '../import-form-facade.service';

import { ImportFormMappingComponent } from './import-form-mapping.component';

describe('ImportFormMappingComponent', () => {
  let component: ImportFormMappingComponent;
  let fixture: ComponentFixture<ImportFormMappingComponent>;
  let importSubject: Subject<ImportWorkflow>;
  let facadeStub: {
    import$: Subject<ImportWorkflow>;
    destroy$: Subject<void>;
    patch: jasmine.Spy;
    save: jasmine.Spy;
  };

  beforeEach(async () => {
    importSubject = new Subject<ImportWorkflow>();
    facadeStub = {
      import$: importSubject,
      destroy$: new Subject<void>(),
      patch: jasmine.createSpy('patch'),
      save: jasmine.createSpy('save').and.returnValue(of({ id: 1 })),
    };

    await TestBed.configureTestingModule({
      imports: [ImportFormMappingComponent, NoopAnimationsModule],
      providers: [
        { provide: ImportFormFacade, useValue: facadeStub },
        {
          provide: ErrorPresentationService,
          useValue: {
            applyFieldErrors: jasmine.createSpy('applyFieldErrors'),
            present: jasmine.createSpy('present'),
          },
        },
      ],
    })
      .compileComponents();

    fixture = TestBed.createComponent(ImportFormMappingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('splits an object mapping into common and field controls', () => {
    importSubject.next({
      mapping: '($cfg := params.cfg;\n{"title": $.title,\n"doi": $.DOI,\n"publisher": {"label": $.publisher}})',
    });

    expect(component.form.get('common')?.value).toBe('$cfg := params.cfg');
    expect(component.form.get('fields.title')?.value).toBe('$.title');
    expect(component.form.get('fields.doi')?.value).toBe('$.DOI');
    expect(component.form.get('fields.publisher')?.value).toBe('{"label": $.publisher}');
    expect(component.activeMappingFields.map((field) => field.key)).toEqual(['title', 'doi', 'publisher']);
  });

  it('compiles field controls back to the workflow mapping', async () => {
    importSubject.next({ mapping: '' });
    component.form.get('common')?.setValue('$cfg := params.cfg;');
    component.setFieldActive('title', true);
    component.setFieldActive('doi', true);
    component.form.get('fields.title')?.setValue('$.title');
    component.form.get('fields.doi')?.setValue('$.DOI');

    await component.persistFormToBackend();

    expect(facadeStub.patch).toHaveBeenCalledWith({
      mapping: '(\n$cfg := params.cfg;\n{\n  "title": $.title,\n  "doi": $.DOI\n}\n)',
    });
  });

  it('omits inactive field controls from the compiled mapping', async () => {
    importSubject.next({
      mapping: '{"title": $.title, "doi": $.DOI}',
    });

    component.setFieldActive('doi', false);
    await component.persistFormToBackend();

    expect(facadeStub.patch).toHaveBeenCalledWith({
      mapping: '{\n  "title": $.title\n}',
    });
  });

  it('preserves add_info mappings used by import templates', async () => {
    importSubject.next({
      mapping: '{"title": $.title, "add_info": $.remark}',
    });

    await component.persistFormToBackend();

    expect(facadeStub.patch).toHaveBeenCalledWith({
      mapping: '{\n  "title": $.title,\n  "add_info": $.remark\n}',
    });
  });

  it('preserves unknown top-level mapping keys when saving parsed mappings', async () => {
    importSubject.next({
      mapping: '($cfg := params.cfg;\n{"title": $.title, "custom_field": $.custom, "publisher": {"label": $.publisher}})',
    });

    await component.persistFormToBackend();

    expect(facadeStub.patch).toHaveBeenCalledWith({
      mapping: '(\n$cfg := params.cfg;\n{\n  "title": $.title,\n  "publisher": {"label": $.publisher},\n  "custom_field": $.custom\n}\n)',
    });
  });
});
