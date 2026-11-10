import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Observable, of, Subject } from 'rxjs';
import { PublicationTag } from '@output/interfaces';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { PublicationTagService } from 'src/app/services/entities/publication-tag.service';
import { PublicationTagFormComponent } from 'src/app/form/publication-tag-form/publication-tag-form.component';
import { PublicationTagSelectionDialogComponent } from './publication-tag-selection-dialog.component';

describe('PublicationTagSelectionDialogComponent', () => {
  const tags = [{ id: 1, label: 'Review', color: '#ffcc00' }, { id: 2, label: 'Invoice missing' }];
  const data = { ids: [1] };
  const ref = { close: vi.fn() };
  const auth = { hasRole: vi.fn(() => true) };
  const service = { getAll: vi.fn((): Observable<PublicationTag[]> => of(tags)) };
  const dialog = { open: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    data.ids = [1];
    auth.hasRole.mockReturnValue(true);
    service.getAll.mockReturnValue(of(tags));
    TestBed.configureTestingModule({
      imports: [PublicationTagSelectionDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data }, { provide: MatDialogRef, useValue: ref },
        { provide: MatDialog, useValue: dialog }, { provide: AuthorizationService, useValue: auth },
        { provide: PublicationTagService, useValue: service },
      ],
    }).overrideProvider(MatDialog, { useValue: dialog });
  });

  it('stages multiple selections and only returns them through the toolbar save action', () => {
    const fixture = TestBed.createComponent(PublicationTagSelectionDialogComponent);
    fixture.detectChanges();
    fixture.componentInstance.selector.add(2);
    fixture.detectChanges();
    expect(data.ids).toEqual([1]);
    expect(ref.close).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('input')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Invoice missing');
    fixture.nativeElement.querySelector('[aria-label="Publikations-Tags speichern"]').click();
    expect(ref.close).toHaveBeenCalledWith({ ids: [1, 2], tags });
  });

  it('discards assignment changes on cancellation', () => {
    const fixture = TestBed.createComponent(PublicationTagSelectionDialogComponent);
    fixture.detectChanges();
    fixture.componentInstance.selector.remove(1);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[aria-label="Abbrechen"]').click();
    expect(ref.close).toHaveBeenCalledWith({ tags });
    expect(data.ids).toEqual([1]);
  });

  it('keeps catalogue editing in the input and returns refreshed labels even on cancellation', () => {
    const updated = { id: 1, label: 'Updated review' };
    dialog.open.mockReturnValue({ afterClosed: () => of({ persisted: true, mode: 'update', entity: updated }) });
    const fixture = TestBed.createComponent(PublicationTagSelectionDialogComponent);
    fixture.detectChanges();
    fixture.componentInstance.selector.search.setValue('Review');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Tag Review bearbeiten"]')).toBeNull();
    fixture.nativeElement.querySelector('[aria-label="Tag bearbeiten"]').click();
    fixture.detectChanges();
    expect(dialog.open).toHaveBeenCalledWith(PublicationTagFormComponent, expect.objectContaining({
      data: { entity: tags[0], persistOnSave: true },
    }));
    expect(fixture.nativeElement.textContent).toContain('Updated review');
    fixture.componentInstance.abort();
    expect(ref.close).toHaveBeenCalledWith({ tags: expect.arrayContaining([updated]) });
  });

  it('prevents applying a selection before the catalogue is loaded or after a loading failure', () => {
    const loading = new Subject<PublicationTag[]>();
    service.getAll.mockReturnValue(loading);
    const fixture = TestBed.createComponent(PublicationTagSelectionDialogComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Tags werden geladen');
    fixture.componentInstance.action();
    expect(ref.close).not.toHaveBeenCalled();
    loading.error(new Error('Unavailable'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Tags konnten nicht geladen werden');
    expect(fixture.nativeElement.querySelector('[aria-label="Publikations-Tags speichern"]')).toBeNull();
    fixture.componentInstance.action();
    expect(ref.close).not.toHaveBeenCalled();
    fixture.nativeElement.querySelector('[aria-label="Schließen"]').click();
    expect(ref.close).toHaveBeenCalledWith({ tags: [] });
  });

  it('enables the input and save action when the catalogue arrives asynchronously', () => {
    const loading = new Subject<PublicationTag[]>();
    service.getAll.mockReturnValue(loading);
    const fixture = TestBed.createComponent(PublicationTagSelectionDialogComponent);
    fixture.detectChanges();
    loading.next(tags);
    loading.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input').readOnly).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain('Tags werden geladen');
    expect(fixture.nativeElement.querySelector('[aria-label="Publikations-Tags speichern"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Review');
  });

  it('prevents assignment changes for readers', () => {
    auth.hasRole.mockReturnValue(false);
    const fixture = TestBed.createComponent(PublicationTagSelectionDialogComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input')).toBeNull();
    fixture.componentInstance.action();
    expect(ref.close).not.toHaveBeenCalled();
  });
});
