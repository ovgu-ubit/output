import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { MatDialog } from '@angular/material/dialog';
import { AuthorizationService } from '../../security/authorization.service';
import { PublicationTagFormComponent } from '../../form/publication-tag-form/publication-tag-form.component';
import { of } from 'rxjs';
import { PublicationTagService } from '../../services/entities/publication-tag.service';
import { PublicationTagSelectComponent } from './publication-tag-select.component';

describe('PublicationTagSelectComponent', () => {
  const auth = { hasRole: vi.fn(() => true) };
  const dialog = { open: vi.fn() };
  beforeEach(() => {
    vi.clearAllMocks();
    auth.hasRole.mockReturnValue(true);
    return TestBed.configureTestingModule({
    imports: [PublicationTagSelectComponent, NoopAnimationsModule],
    providers: [{ provide: AuthorizationService, useValue: auth }, { provide: MatDialog, useValue: dialog },
      { provide: PublicationTagService, useValue: { getAll: () => of([
      { id: 1, label: 'Rechnung fehlt', description: 'Beleg nachfordern', color: '#ffcc00' },
      { id: 2, label: 'Affiliation prüfen' },
    ]) } }],
    }).overrideProvider(MatDialog, { useValue: dialog });
  });

  it('renders readonly labels and historical missing selections without an editable control', () => {
    const fixture = TestBed.createComponent(PublicationTagSelectComponent);
    fixture.componentRef.setInput('readonly', true);
    fixture.componentRef.setInput('ids', [1, 99]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Rechnung fehlt');
    expect(fixture.nativeElement.textContent).toContain('Gelöschter Tag #99');
    expect(fixture.nativeElement.querySelector('input')).toBeNull();
  });

  it('filters the catalogue by name and emits the selected IDs', async () => {
    const fixture = TestBed.createComponent(PublicationTagSelectComponent);
    fixture.detectChanges();
    const search = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    search.value = 'Affiliation';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    const selection = fixture.debugElement.query(By.directive(MatAutocompleteTrigger)).injector.get(MatAutocompleteTrigger);
    selection.openPanel();
    fixture.detectChanges();
    await fixture.whenStable();
    const options = [...document.querySelectorAll('mat-option')];
    expect(options.map(option => option.textContent.trim())).toEqual(['Affiliation prüfen']);
    const emitted = vi.fn();
    fixture.componentInstance.idsChange.subscribe(emitted);
    (options[0] as HTMLElement).click();
    expect(emitted).toHaveBeenCalledWith([2]);
    await fixture.whenStable();
    expect(search.value).toBe('');
    selection.closePanel();
  });
  it('preserves other selections when removing a chip and does not add duplicates', () => {
    const fixture = TestBed.createComponent(PublicationTagSelectComponent);
    fixture.componentRef.setInput('ids', [1, 2]);
    fixture.detectChanges();
    const changed = vi.fn();
    fixture.componentInstance.idsChange.subscribe(changed);
    fixture.componentInstance.add(1);
    expect(changed).not.toHaveBeenCalled();
    fixture.nativeElement.querySelector('[aria-label="Tag Rechnung fehlt entfernen"]').click();
    expect(changed).toHaveBeenCalledWith([2]);
  });

  it('replaces the selected tag in single-selection filters', () => {
    const fixture = TestBed.createComponent(PublicationTagSelectComponent);
    fixture.componentRef.setInput('ids', [1]);
    fixture.componentRef.setInput('multiple', false);
    fixture.detectChanges();
    const changed = vi.fn();
    fixture.componentInstance.idsChange.subscribe(changed);
    fixture.componentInstance.add(2);
    expect(changed).toHaveBeenCalledWith([2]);
  });

  it('creates tags through the entity dialog and assigns the persisted tag', () => {
    const saved = { id: 3, label: 'New tag', color: '#000000' };
    dialog.open.mockReturnValue({ afterClosed: () => of({ persisted: true, mode: 'create', entity: saved }) });
    const fixture = TestBed.createComponent(PublicationTagSelectComponent);
    fixture.componentRef.setInput('manageCatalog', true);
    fixture.componentRef.setInput('ids', [1]);
    fixture.detectChanges();
    fixture.componentInstance.search.setValue('New tag');
    fixture.detectChanges();
    const changed = vi.fn();
    fixture.componentInstance.idsChange.subscribe(changed);
    fixture.nativeElement.querySelector('[aria-label="Tag anlegen"]').click();
    expect(dialog.open).toHaveBeenCalledWith(PublicationTagFormComponent, expect.objectContaining({ data: { entity: { label: 'New tag' }, persistOnSave: true } }));
    expect(changed).toHaveBeenCalledWith([1, 3]);
    expect(fixture.componentInstance.tags).toContainEqual(saved);
  });

  it('edits tags only through the input and preserves assignments', () => {
    const saved = { id: 1, label: 'Updated', color: '#000000' };
    dialog.open.mockReturnValue({ afterClosed: () => of({ persisted: true, mode: 'update', entity: saved }) });
    const fixture = TestBed.createComponent(PublicationTagSelectComponent);
    fixture.componentRef.setInput('manageCatalog', true);
    fixture.componentRef.setInput('ids', [1]);
    fixture.detectChanges();
    const changed = vi.fn();
    fixture.componentInstance.idsChange.subscribe(changed);
    expect(fixture.nativeElement.querySelector('[aria-label="Tag Rechnung fehlt bearbeiten"]')).toBeNull();
    fixture.componentInstance.search.setValue('Rechnung fehlt');
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[aria-label="Tag bearbeiten"]').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Updated');
    expect(changed).not.toHaveBeenCalled();
  });

  it('prevents catalogue changes for non-admins and assignment changes in readonly views', () => {
    auth.hasRole.mockReturnValue(false);
    const fixture = TestBed.createComponent(PublicationTagSelectComponent);
    fixture.componentRef.setInput('manageCatalog', true);
    fixture.componentRef.setInput('ids', [1]);
    fixture.detectChanges();
    fixture.componentInstance.search.setValue('New tag');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Tag anlegen"]')).toBeNull();
    fixture.componentInstance.edit({ label: 'New tag' });
    expect(dialog.open).not.toHaveBeenCalled();
    fixture.componentRef.setInput('readonly', true);
    fixture.detectChanges();
    const changed = vi.fn();
    fixture.componentInstance.idsChange.subscribe(changed);
    fixture.componentInstance.add(2);
    fixture.componentInstance.remove(1);
    expect(changed).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

});
