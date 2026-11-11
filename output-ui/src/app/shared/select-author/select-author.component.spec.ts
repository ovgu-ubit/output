import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent, MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { AuthorService } from 'src/app/services/entities/author.service';
import { SelectAuthorComponent } from './select-author.component';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { By } from '@angular/platform-browser';
import { Author } from '@output/interfaces';
import { AuthorFormComponent } from 'src/app/form/author-form/author-form.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

describe('SelectAuthorComponent', () => {
    let component: SelectAuthorComponent;
    let fixture: ComponentFixture<SelectAuthorComponent>;

    const authors: Author[] = [
        { id: 11, first_name: 'Alex', last_name: 'Müller', institutes: [{ id: 1, label: 'Institut für Physik' }] },
        { id: 22, first_name: 'Alex', last_name: 'Müller', institutes: [
            { id: 2, label: 'Institut für Chemie' }, { id: 3, label: 'Institut für Biologie' },
        ] },
        { id: 33, first_name: 'Sam', last_name: 'Schmidt', orcid: '0000-0002-1825-0097' },
    ];

    const mockAuthorService = {
        getAll: vi.fn().mockName('getAll').mockImplementation(() => of([...authors]))
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [
                NoopAnimationsModule,
                ReactiveFormsModule,
                MatAutocompleteModule,
                MatDialogModule,
                MatSnackBarModule,
                MatFormFieldModule,
                MatInputModule,
                MatButtonModule,
                MatIconModule,
                MatTooltipModule
            ],
            declarations: [SelectAuthorComponent],
            providers: [
                { provide: AuthorService, useValue: mockAuthorService },
                { provide: ErrorPresentationService, useValue: { present: () => { } } },
                provideHttpClient(withXhr()),
                provideHttpClientTesting()
            ]
        })
            .compileComponents();

        fixture = TestBed.createComponent(SelectAuthorComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('serviceClass', mockAuthorService);
        fixture.componentRef.setInput('name', 'Person');
        fixture.detectChanges();
    });

    async function openSuggestions(value: string): Promise<HTMLElement[]> {
        const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
        input.value = value;
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();
        fixture.debugElement.query(By.directive(MatAutocompleteTrigger)).injector.get(MatAutocompleteTrigger).openPanel();
        fixture.detectChanges();
        await fixture.whenStable();
        return Array.from(document.querySelectorAll<HTMLElement>('mat-option'));
    }

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('shows the person ID and all institutes for people with identical names and no ORCID', async () => {
        const options = await openSuggestions('Müller');

        expect(options).toHaveLength(2);
        expect(options[0].textContent).toContain('Müller, Alex');
        expect(options[0].textContent).toContain('Personen-ID: 11');
        expect(options[0].textContent).toContain('Institut für Physik');
        expect(options[1].textContent).toContain('Müller, Alex');
        expect(options[1].textContent).toContain('Personen-ID: 22');
        expect(options[1].textContent).toContain('Institut für Chemie');
        expect(options[1].textContent).toContain('Institut für Biologie');
    });

    it.each([false, true])('selects the clicked person by ID with resetOnSelect=%s', async (resetOnSelect) => {
        fixture.componentRef.setInput('resetOnSelect', resetOnSelect);
        const selected = vi.fn();
        component.selected.subscribe(selected);
        const options = await openSuggestions('Müller');

        options[1].click();
        fixture.detectChanges();
        await fixture.whenStable();

        expect(selected).toHaveBeenCalledExactlyOnceWith(authors[1]);
        expect(component.ent.id).toBe(22);
        expect(component.form.get('input').value).toBe(resetOnSelect ? '' : 'Müller, Alex');
        expect(fixture.nativeElement.querySelector('input').value).toBe(resetOnSelect ? '' : 'Müller, Alex');
    });

    it('keeps the selected person when opening the edit dialog for an identical name', async () => {
        fixture.componentRef.setInput('formComponent', AuthorFormComponent);
        const open = vi.spyOn(TestBed.inject(MatDialog), 'open').mockReturnValue({ afterClosed: () => of(null) } as any);
        const options = await openSuggestions('Müller');
        options[1].click();
        fixture.detectChanges();
        await fixture.whenStable();

        fixture.nativeElement.querySelector('button').click();

        expect(open).toHaveBeenCalledWith(AuthorFormComponent, expect.objectContaining({
            data: { entity: authors[1], persistOnSave: true },
        }));
    });

    it('still searches by ORCID and indicates when no institute is recorded', async () => {
        const options = await openSuggestions('1825');

        expect(options).toHaveLength(1);
        expect(options[0].textContent).toContain('Schmidt, Sam');
        expect(options[0].textContent).toContain('0000-0002-1825-0097');
        expect(options[0].textContent).toContain('Personen-ID: 33');
        expect(options[0].textContent).toContain('Kein Institut hinterlegt');
    });

    it('still offers to create a person for a new name', async () => {
        fixture.componentRef.setInput('formComponent', AuthorFormComponent);
        const open = vi.spyOn(TestBed.inject(MatDialog), 'open').mockReturnValue({ afterClosed: () => of(null) } as any);
        await openSuggestions('Neu, Kim');

        fixture.nativeElement.querySelector('button').click();

        expect(open).toHaveBeenCalledWith(ConfirmDialogComponent, expect.objectContaining({
            data: expect.objectContaining({ message: 'Möchten Sie den/die Person "Neu, Kim" anlegen?' }),
        }));
        expect(component.form.get('input').enabled).toBe(true);
    });

    it('does not change the selected person when disabled', () => {
        fixture.componentRef.setInput('ent', authors[1]);
        fixture.componentRef.setInput('disabled', true);
        fixture.detectChanges();
        const selected = vi.fn();
        component.selected.subscribe(selected);

        component.selectedEnt({ option: { value: 11 } } as MatAutocompleteSelectedEvent);

        expect(component.ent.id).toBe(22);
        expect(component.form.get('input').disabled).toBe(true);
        expect(selected).not.toHaveBeenCalled();
    });
});
