import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ConfigService } from 'src/app/administration/services/config.service';
import { EnrichService } from 'src/app/administration/services/enrich.service';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { ContractService } from 'src/app/services/entities/contract.service';
import { FunderService } from 'src/app/services/entities/funder.service';
import { GreaterEntityService } from 'src/app/services/entities/greater-entity.service';
import { LanguageService } from 'src/app/services/entities/language.service';
import { OACategoryService } from 'src/app/services/entities/oa-category.service';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { PublicationTypeService } from 'src/app/services/entities/publication-type.service';
import { PublisherService } from 'src/app/services/entities/publisher.service';
import { PublicationTagService } from 'src/app/services/entities/publication-tag.service';
import { StatusService } from 'src/app/services/entities/status.service';
import { SharedModule } from 'src/app/shared/shared.module';
import { TableModule } from 'src/app/table/table.module';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { PublicationFormComponent, PubValidator } from './publication-form.component';
import { PublicationChangeLogComponent } from '../publication-change-log/publication-change-log.component';

describe('PublicationFormComponent', () => {
    beforeEach(() => {
        vi.useFakeTimers({ advanceTimeDelta: 1, shouldAdvanceTime: true });
    });
    afterEach(() => {
        vi.useRealTimers();
    });
    let component: PublicationFormComponent;
    let fixture: ComponentFixture<PublicationFormComponent>;

    it('sends tag_ids only after an explicit selection change', () => {
        component.pub = { id: 1, title: 'Example', tags: [{ id: 2, label: 'Review' }] };
        component.edit = true;
        component.form.get('tag_ids').setValue([2]);
        expect((component as any).buildPublicationPayload().tag_ids).toBeUndefined();
        component.form.get('tag_ids').setValue([]);
        component.form.get('tag_ids').markAsDirty();
        expect((component as any).buildPublicationPayload().tag_ids).toEqual([]);
    });

    it('shows tags in the toolbar and removes assignments through the chip', () => {
        component.pub = { ...component.pub, tags: [{ id: 2, label: 'Review', color: '#000000' }] };
        component.form.get('tag_ids').setValue([2]);
        fixture.detectChanges();
        const toolbar = fixture.nativeElement.querySelector('app-window-toolbar');
        expect(toolbar.textContent).toContain('Review');
        expect(fixture.nativeElement.querySelectorAll('app-publication-tag-chip')).toHaveLength(1);
        toolbar.querySelector('[aria-label="Tag Review entfernen"]').click();
        fixture.detectChanges();
        expect(component.form.get('tag_ids').value).toEqual([]);
        expect(component.form.get('tag_ids').dirty).toBe(true);
        expect((component as any).buildPublicationPayload().tag_ids).toEqual([]);
        expect(toolbar.textContent).not.toContain('Review');
    });

    it('updates toolbar chips immediately after autocomplete selection', () => {
        component.pub = { ...component.pub, tags: [{ id: 2, label: 'Existing' }] };
        component.form.get('tag_ids').setValue([2]);
        fixture.detectChanges();
        component.tagSelect.tags = [{ id: 3, label: 'New selection', color: '#ffcc00' }];
        component.tagSelect.add(3);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('app-window-toolbar').textContent).toContain('New selection');
        expect(component.form.get('tag_ids').value).toEqual([2, 3]);
    });

    it('edits tags through the input and hides editing controls in readonly mode', () => {
        const tag = { id: 2, label: 'Review' };
        component.pub = { ...component.pub, tags: [tag] };
        component.form.get('tag_ids').setValue([2]);
        const edit = vi.spyOn(component.tagSelect, 'edit').mockImplementation(() => {});
        fixture.detectChanges();
        const toolbar = fixture.nativeElement.querySelector('app-window-toolbar');
        expect(toolbar.querySelector('[aria-label="Tag Review bearbeiten"]')).toBeNull();
        component.tagSelect.tags = [tag];
        component.tagSelect.search.setValue('Review');
        fixture.detectChanges();
        fixture.nativeElement.querySelector('[aria-label="Tag bearbeiten"]').click();
        expect(edit).toHaveBeenCalledWith(tag);
        component.disable();
        fixture.detectChanges();
        expect(toolbar.querySelector('[aria-label="Tag Review entfernen"]')).toBeNull();
        expect(toolbar.querySelector('[aria-label="Tag Review bearbeiten"]')).toBeNull();
        expect(toolbar.textContent).toContain('Review');
    });

    it('prevents tag changes on locked publications and enables them after unlocking', () => {
        component.pub = { ...component.pub, locked: true, tags: [{ id: 2, label: 'Review' }] };
        component.form.get('tag_ids').setValue([2]);
        component.setLock(true);
        fixture.detectChanges();
        expect(component.tagSelect.readonly).toBe(true);
        expect(fixture.nativeElement.querySelector('[aria-label="Tag Review entfernen"]')).toBeNull();
        expect(fixture.nativeElement.querySelector('app-publication-tag-select input')).toBeNull();
        component.setTagIds([3]);
        component.removeTag(2);
        expect(component.form.get('tag_ids').value).toEqual([2]);
        expect(component.form.get('tag_ids').dirty).toBe(false);
        component.pub.locked = false;
        component.setLock(false);
        fixture.detectChanges();
        expect(component.tagSelect.readonly).toBe(false);
        component.removeTag(2);
        expect(component.form.get('tag_ids').value).toEqual([]);
        expect(component.form.get('tag_ids').dirty).toBe(true);
    });

    it('uses the booking amount including zero, otherwise adds net amounts and VAT', () => {
        const items = [{ euro_value: 100, vat: 19 }, { euro_value: 50, vat: 3.5 }];
        const costs = PublicationFormComponent.prototype.getCosts;
        expect(costs({ booking_amount: 200, cost_items: items })).toBe(200);
        expect(costs({ booking_amount: 0, cost_items: items })).toBe(0);
        expect(costs({ cost_items: items })).toBe(172.5);
        expect(costs({ cost_items: [{ euro_value: 100 }, { vat: 7 }] })).toBe(107);
        expect(costs({ cost_items: [] })).toBe(0);
        expect(costs({})).toBe('');
    });

    const mockDialogRef = {
        close: vi.fn().mockName('close'),
        addPanelClass: vi.fn().mockName('addPanelClass'),
        removePanelClass: vi.fn().mockName('removePanelClass'),
        updateSize: vi.fn().mockName('updateSize'),
        updatePosition: vi.fn().mockName('updatePosition')
    };

    const mockAuthService = {
        hasRole: vi.fn().mockName('hasRole').mockReturnValue(true)
    };

    const mockConfigService = {
        get: vi.fn().mockName('get').mockReturnValue(of({ value: {} }))
    };

    const mockStatusService = {
        getAll: vi.fn().mockName('getAll').mockReturnValue(of([]))
    };

    const mockPubService = {
        getOne: vi.fn().mockName('getOne').mockReturnValue(of({
            id: 1,
            title: 'Test Pub',
            authorPublications: [],
            identifiers: []
        })),
        update: vi.fn().mockName('update').mockReturnValue(of({})),
        add: vi.fn().mockName('add').mockReturnValue(of({})),
        getChanges: vi.fn().mockName('getChanges').mockReturnValue(of([]))
    };

    beforeEach(async () => {
        TestBed.configureTestingModule({
            imports: [
                NoopAnimationsModule,
                ReactiveFormsModule,
                MatDialogModule,
                MatSnackBarModule,
                MatTooltipModule,
                SharedModule,
                TableModule,
                PublicationChangeLogComponent
            ],
            declarations: [PublicationFormComponent],
            providers: [
                { provide: PublicationTagService, useValue: { getAll: () => of([]) } },
                FormBuilder,
                PubValidator,
                { provide: MatDialogRef, useValue: mockDialogRef },
                { provide: MAT_DIALOG_DATA, useValue: { entity: { id: 1 } } },
                { provide: AuthorizationService, useValue: mockAuthService },
                { provide: ConfigService, useValue: mockConfigService },
                { provide: StatusService, useValue: mockStatusService },
                { provide: PublicationService, useValue: mockPubService },
                { provide: PublicationTypeService, useValue: { getAll: () => of([]) } },
                { provide: OACategoryService, useValue: { getAll: () => of([]) } },
                { provide: GreaterEntityService, useValue: { getAll: () => of([]) } },
                { provide: PublisherService, useValue: { getAll: () => of([]) } },
                { provide: ContractService, useValue: { getAll: () => of([]) } },
                { provide: FunderService, useValue: { getAll: () => of([]) } },
                { provide: LanguageService, useValue: { getAll: () => of([]) } },
                { provide: EnrichService, useValue: { startID: () => of({}) } },
                { provide: ErrorPresentationService, useValue: { clearFieldErrors: () => { }, applyFieldErrors: () => { }, present: () => { } } },
                provideHttpClient(withXhr()),
                provideHttpClientTesting(),
                provideRouter([]),
                provideStore({})
            ]
        })
            .compileComponents();

        fixture = TestBed.createComponent(PublicationFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(0);
        fixture.detectChanges();
        await vi.runOnlyPendingTimersAsync();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
