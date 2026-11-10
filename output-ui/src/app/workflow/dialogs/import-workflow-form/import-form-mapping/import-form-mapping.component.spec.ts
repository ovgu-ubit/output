import type { Mock } from "vitest";
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, Subject } from 'rxjs';
import { ImportWorkflow, PublicationTag } from '@output/interfaces';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { PublicationTagService } from 'src/app/services/entities/publication-tag.service';
import { ImportFormFacade } from '../import-form-facade.service';

import { ImportFormMappingComponent } from './import-form-mapping.component';

describe('ImportFormMappingComponent', () => {
    let component: ImportFormMappingComponent;
    let fixture: ComponentFixture<ImportFormMappingComponent>;
    let importSubject: Subject<ImportWorkflow>;
    let tagSubject: Subject<PublicationTag[]>;
    let facadeStub: {
        import$: Subject<ImportWorkflow>;
        destroy$: Subject<void>;
        patch: Mock;
        save: Mock;
    };

    beforeEach(async () => {
        importSubject = new Subject<ImportWorkflow>();
        tagSubject = new Subject<PublicationTag[]>();
        facadeStub = {
            import$: importSubject,
            destroy$: new Subject<void>(),
            patch: vi.fn().mockName('patch'),
            save: vi.fn().mockName('save').mockReturnValue(of({ id: 1 })),
        };

        await TestBed.configureTestingModule({
            imports: [ImportFormMappingComponent, NoopAnimationsModule],
            providers: [
                { provide: PublicationTagService, useValue: { getAll: () => tagSubject } },
                { provide: ImportFormFacade, useValue: facadeStub },
                {
                    provide: ErrorPresentationService,
                    useValue: {
                        applyFieldErrors: vi.fn().mockName('applyFieldErrors'),
                        present: vi.fn().mockName('present'),
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

    it('exposes per-record tag conditions and preserves the JSONata expression', async () => {
        const condition = '$count(invoices) = 0 ? ["Rechnung fehlt"] : []';
        importSubject.next({ mapping: `{"title": $.title, "tags": ${condition}}` });
        expect(component.form.get('fields.tags')?.value).toBe(condition);
        expect(component.activeMappingFields.map(field => field.key)).toContain('tags');
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Verfügbare Tag-Bezeichnungen');
        await component.persistFormToBackend();
        expect(facadeStub.patch).toHaveBeenCalledWith({ mapping: `{\n  "title": $.title,\n  "tags": ${condition}\n}` });
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

    it('shows sorted catalogue labels as readonly chips without modifying the mapping', () => {
        importSubject.next({ mapping: '{"tags": []}' });
        tagSubject.next([{ id: 2, label: 'Rechnung fehlt', color: '#ffcc00' }, { id: 1, label: 'Affiliation prüfen' }]);
        fixture.detectChanges();
        const catalogue = fixture.nativeElement.querySelector('.mapping-tag-catalog');
        const labels = [...catalogue.querySelectorAll('mat-chip')].map((chip: HTMLElement) => chip.textContent.trim());
        expect(labels).toEqual(['Affiliation prüfen', 'Rechnung fehlt']);
        expect(catalogue.querySelector('button')).toBeNull();
        expect(component.form.get('fields.tags')?.value).toBe('[]');
        expect(component.hasPendingChanges()).toBe(false);
    });

    it('distinguishes a loading catalogue from an empty catalogue', () => {
        importSubject.next({ mapping: '{"tags": []}' });
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Tag-Bezeichnungen werden geladen');
        expect(fixture.nativeElement.textContent).not.toContain('Noch keine Tags im Katalog');
        tagSubject.next([]);
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Noch keine Tags im Katalog vorhanden');
    });

    it('keeps mapping edits available when catalogue loading fails', async () => {
        importSubject.next({ mapping: '{"tags": []}' });
        tagSubject.error(new Error('Catalogue unavailable'));
        fixture.detectChanges();
        expect(fixture.nativeElement.textContent).toContain('Tag-Bezeichnungen konnten nicht geladen werden');
        expect(fixture.nativeElement.textContent).not.toContain('Noch keine Tags im Katalog');
        component.form.get('fields.tags')?.setValue('["Review"]');
        await component.persistFormToBackend();
        expect(facadeStub.save).toHaveBeenCalled();
        expect(facadeStub.patch).toHaveBeenCalledWith({ mapping: '{\n  "tags": ["Review"]\n}' });
    });
});
