import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, Subject } from 'rxjs';
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
import { ConfirmDialogComponent } from 'src/app/shared/confirm-dialog/confirm-dialog.component';
import { PublicationFormComponent, PubValidator } from './publication-form.component';
import { PublicationChangeLogComponent } from '../publication-change-log/publication-change-log.component';
import { PublicationTagSelectionDialogComponent, PublicationTagSelectionResult } from '../publication-tag-selection-dialog/publication-tag-selection-dialog.component';

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

    it('opens the autocomplete in a separate dialog and updates toolbar chips after applying the selection', () => {
        component.pub = { ...component.pub, tags: [{ id: 2, label: 'Existing' }] };
        component.form.get('tag_ids').setValue([2]);
        const selection = new Subject<PublicationTagSelectionResult>();
        const open = vi.spyOn(TestBed.inject(MatDialog), 'open').mockReturnValue({ afterClosed: () => selection } as any);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('app-publication-tag-select')).toBeNull();
        fixture.nativeElement.querySelector('app-window-toolbar [aria-label="Tags hinzufügen"]').click();
        expect(open).toHaveBeenCalledWith(PublicationTagSelectionDialogComponent, expect.objectContaining({
            data: { ids: [2] }, autoFocus: 'input',
        }));
        expect(component.form.get('tag_ids').value).toEqual([2]);
        expect(component.form.get('tag_ids').dirty).toBe(false);
        selection.next({ ids: [2, 3], tags: [{ id: 3, label: 'New selection', color: '#ffcc00' }] });
        selection.complete();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('app-window-toolbar').textContent).toContain('New selection');
        expect(component.form.get('tag_ids').value).toEqual([2, 3]);
        expect((component as any).buildPublicationPayload().tag_ids).toEqual([2, 3]);
    });

    it('adds a tag through the real dialog autocomplete and saves it back to the publication draft', async () => {
        vi.spyOn(TestBed.inject(PublicationTagService), 'getAll').mockReturnValue(of([{ id: 3, label: 'Review metadata' }]));
        fixture.nativeElement.querySelector('[aria-label="Tags hinzufügen"]').click();
        await vi.runOnlyPendingTimersAsync();
        const input = document.querySelector('mat-dialog-container app-publication-tag-select input') as HTMLInputElement;
        expect(input).not.toBeNull();
        expect(document.activeElement).toBe(input);
        input.value = 'Review';
        input.dispatchEvent(new Event('input'));
        await vi.runOnlyPendingTimersAsync();
        const option = document.querySelector('mat-option') as HTMLElement;
        expect(option.textContent).toContain('Review metadata');
        option.click();
        await vi.runOnlyPendingTimersAsync();
        expect(component.form.get('tag_ids').value).toEqual([]);
        (document.querySelector('mat-dialog-container [aria-label="Publikations-Tags speichern"]') as HTMLButtonElement).click();
        await vi.runOnlyPendingTimersAsync();
        fixture.detectChanges();
        expect(component.form.get('tag_ids').value).toEqual([3]);
        expect(fixture.nativeElement.querySelector('app-window-toolbar').textContent).toContain('Review metadata');
        expect((component as any).buildPublicationPayload().tag_ids).toEqual([3]);
    });

    it('keeps assignments unchanged on cancellation while refreshing edited catalogue labels', () => {
        const tag = { id: 2, label: 'Review' };
        component.pub = { ...component.pub, tags: [tag] };
        component.form.get('tag_ids').setValue([2]);
        vi.spyOn(TestBed.inject(MatDialog), 'open').mockReturnValue({ afterClosed: () => of({
            tags: [{ id: 2, label: 'Updated review', color: '#ffcc00' }],
        }) } as any);
        fixture.detectChanges();
        const toolbar = fixture.nativeElement.querySelector('app-window-toolbar');
        expect(toolbar.querySelector('[aria-label="Tag Review bearbeiten"]')).toBeNull();
        component.openTagSelection();
        fixture.detectChanges();
        expect(toolbar.textContent).toContain('Updated review');
        expect(component.form.get('tag_ids').value).toEqual([2]);
        expect(component.form.get('tag_ids').dirty).toBe(false);
        expect((component as any).buildPublicationPayload().tag_ids).toBeUndefined();
        component.disable();
        fixture.detectChanges();
        expect(toolbar.querySelector('[aria-label="Tag Updated review entfernen"]')).toBeNull();
        expect(toolbar.querySelector('[aria-label="Tags hinzufügen"]')).toBeNull();
        expect(toolbar.textContent).toContain('Updated review');
    });

    it('does not mark unchanged tag selections as dirty', () => {
        component.form.get('tag_ids').setValue([2]);
        vi.spyOn(TestBed.inject(MatDialog), 'open').mockReturnValue({ afterClosed: () => of({
            ids: [2], tags: [{ id: 2, label: 'Review' }],
        }) } as any);
        component.openTagSelection();
        expect(component.form.get('tag_ids').dirty).toBe(false);
        expect((component as any).buildPublicationPayload().tag_ids).toBeUndefined();
    });

    it('preserves pending tag labels when a later dialog is cancelled before loading', () => {
        vi.spyOn(TestBed.inject(MatDialog), 'open')
            .mockReturnValueOnce({ afterClosed: () => of({ ids: [3], tags: [{ id: 3, label: 'Pending tag' }] }) } as any)
            .mockReturnValueOnce({ afterClosed: () => of({ tags: [] }) } as any);
        component.openTagSelection();
        component.openTagSelection();
        fixture.detectChanges();
        expect(component.form.get('tag_ids').value).toEqual([3]);
        expect(fixture.nativeElement.querySelector('app-window-toolbar').textContent).toContain('Pending tag');
    });

    it('prevents tag changes on locked publications and enables them after unlocking', () => {
        component.pub = { ...component.pub, locked: true, tags: [{ id: 2, label: 'Review' }] };
        component.form.get('tag_ids').setValue([2]);
        component.setLock(true);
        fixture.detectChanges();
        const open = vi.spyOn(TestBed.inject(MatDialog), 'open');
        expect(fixture.nativeElement.querySelector('[aria-label="Tags hinzufügen"]')).toBeNull();
        expect(fixture.nativeElement.querySelector('[aria-label="Tag Review entfernen"]')).toBeNull();
        expect(fixture.nativeElement.querySelector('app-publication-tag-select input')).toBeNull();
        component.openTagSelection();
        expect(open).not.toHaveBeenCalled();
        component.setTagIds([3]);
        component.removeTag(2);
        expect(component.form.get('tag_ids').value).toEqual([2]);
        expect(component.form.get('tag_ids').dirty).toBe(false);
        component.pub.locked = false;
        component.setLock(false);
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('[aria-label="Tags hinzufügen"]')).not.toBeNull();
        component.removeTag(2);
        expect(component.form.get('tag_ids').value).toEqual([]);
        expect(component.form.get('tag_ids').dirty).toBe(true);
    });

    it('does not offer tag editing to readers', () => {
        mockAuthService.hasRole.mockImplementation(role => role === 'reader');
        component.pub = { ...component.pub, tags: [{ id: 2, label: 'Review' }] };
        component.form.get('tag_ids').setValue([2]);
        const open = vi.spyOn(TestBed.inject(MatDialog), 'open');
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('app-window-toolbar').textContent).toContain('Review');
        expect(fixture.nativeElement.querySelector('[aria-label="Tags hinzufügen"]')).toBeNull();
        expect(fixture.nativeElement.querySelector('[aria-label="Tag Review entfernen"]')).toBeNull();
        component.openTagSelection();
        expect(open).not.toHaveBeenCalled();
    });

    it('blocks identifier changes while locked and allows them again after unlocking', () => {
        const identifier = { id: 7, type: 'PMID', value: '12345' };
        component.pub = { ...component.pub, identifiers: [identifier] };
        fixture.detectChanges();
        component.idTable.idForm.setValue({ type: 'ISBN', value: '9781234567890' });

        component.lock();
        fixture.detectChanges();

        expect(component.idTable.disabled).toBe(true);
        expect(fixture.nativeElement.querySelector('app-id-table input')).toBeNull();
        expect(fixture.nativeElement.querySelector('[matTooltip="Identifikator löschen"]').hidden).toBe(true);
        component.idTable.addId();
        component.idTable.deleteId(identifier);
        expect(component.pub.identifiers).toEqual([identifier]);

        component.lock();
        fixture.detectChanges();

        expect(component.idTable.disabled).toBe(false);
        expect(fixture.nativeElement.querySelector('app-id-table input')).not.toBeNull();
        const deleteButton = fixture.nativeElement.querySelector('[matTooltip="Identifikator löschen"]');
        expect(deleteButton.hidden).toBe(false);
        deleteButton.click();
        fixture.nativeElement.querySelector('[matTooltip="Identifikator hinzufügen"]').click();
        expect(component.pub.identifiers).toEqual([{ type: 'ISBN', value: '9781234567890' }]);
    });

    it.each(['publication', 'biblio', 'readonly'])(
        'blocks supplement changes with the %s lock', (lock) => {
            const supplement = { id: 7, link: 'https://example.test/existing' };
            component.pub = { ...component.pub, supplements: [supplement] };
            component.supplForm.setValue({ link: 'https://example.test/new' });
            if (lock === 'readonly') component.disable();
            else component.lock(lock === 'biblio' ? 'biblio' : undefined);
            fixture.detectChanges();

            expect(fixture.nativeElement.querySelector('input[placeholder="Link zur Ressource"]')).toBeNull();
            expect(fixture.nativeElement.querySelector('[matTooltip="Ressource hinzufügen"]')).toBeNull();
            expect(fixture.nativeElement.querySelector('[matTooltip="Ressource löschen"]').hidden).toBe(true);
            component.addSuppl();
            component.deleteSuppl(supplement);
            expect(component.pub.supplements).toEqual([supplement]);
        },
    );

    it('allows supplement changes after unlocking the publication and its bibliographic information', () => {
        const supplement = { id: 7, link: 'https://example.test/existing' };
        component.pub = { ...component.pub, supplements: [supplement] };
        component.supplForm.setValue({ link: 'https://example.test/new' });
        component.lock();
        component.lock();
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('input[placeholder="Link zur Ressource"]')).toBeNull();

        component.lock('biblio');
        fixture.detectChanges();

        expect(fixture.nativeElement.querySelector('input[placeholder="Link zur Ressource"]')).not.toBeNull();
        const deleteButton = fixture.nativeElement.querySelector('[matTooltip="Ressource löschen"]');
        expect(deleteButton.hidden).toBe(false);
        deleteButton.click();
        fixture.nativeElement.querySelector('[matTooltip="Ressource hinzufügen"]').click();
        expect(component.pub.supplements).toEqual([{ link: 'https://example.test/new' }]);
    });

    describe.each([
        { area: undefined, field: 'locked' },
        { area: 'author', field: 'locked_author' },
        { area: 'biblio', field: 'locked_biblio' },
        { area: 'oa', field: 'locked_oa' },
        { area: 'finance', field: 'locked_finance' },
    ])('$field changes', ({ area, field }) => {
        it.each([false, true])('asks to save when aborting after changing the lock from %s', (locked) => {
            if (locked) component.lock(area);
            component.form.markAsPristine();
            const confirmation = new Subject<boolean>();
            const open = vi.spyOn(TestBed.inject(MatDialog), 'open').mockReturnValue({
                afterClosed: () => confirmation,
            } as any);
            const save = vi.spyOn(component, 'action').mockResolvedValue(undefined);

            component.lock(area);
            component.abort();

            expect(component.pub[field]).toBe(!locked);
            expect(component.form.dirty).toBe(true);
            expect(open).toHaveBeenCalledWith(ConfirmDialogComponent, expect.objectContaining({
                data: expect.objectContaining({ title: 'Ungesicherte Änderungen' }),
            }));
            confirmation.next(true);
            confirmation.complete();
            expect(save).toHaveBeenCalledOnce();
        });
    });

    it('keeps a loaded locked publication pristine and does not ask to save on abort', () => {
        vi.spyOn(TestBed.inject(PublicationService), 'getOne').mockReturnValueOnce(of({
            id: 1, title: 'Locked publication', locked: true,
        }));
        component.loadPub(1).subscribe();
        const open = vi.spyOn(TestBed.inject(MatDialog), 'open');

        component.abort();

        expect(component.form.dirty).toBe(false);
        expect(open).not.toHaveBeenCalled();
        expect(mockDialogRef.close).toHaveBeenCalledWith({ id: 1, locked_at: null });
    });

    it('keeps lock state and form pristine when editing is disabled', () => {
        component.disable();

        component.lock();
        component.lock('biblio');

        expect(component.pub.locked).toBeFalsy();
        expect(component.pub.locked_biblio).toBeFalsy();
        expect(component.form.dirty).toBe(false);
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
        getOne: vi.fn().mockName('getOne').mockImplementation(() => of({
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
        mockAuthService.hasRole.mockReturnValue(true);
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
