import { TagColorDialogComponent } from './tag-color-dialog.component';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { PublicationTag } from '@output/interfaces';
import { PublicationTagFormComponent } from './publication-tag-form.component';
import { PublicationTagService } from '../../services/entities/publication-tag.service';
import { AuthorizationService } from '../../security/authorization.service';
import { ErrorPresentationService } from '../../core/errors/error-presentation.service';

describe('PublicationTagFormComponent', () => {
  let data: { entity?: PublicationTag };
  const tag = { id: 7, label: 'Review', description: 'Check metadata', color: '#000000' };
  const dialog = { open: vi.fn(() => ({ afterClosed: () => of(undefined as string | null | undefined) })) };
  const ref = { close: vi.fn() };
  const auth = { hasRole: vi.fn(() => true) };
  const errors = { clearFieldErrors: vi.fn(), applyFieldErrors: vi.fn(), present: vi.fn() };
  const service = { getOne: vi.fn(() => of(tag)), add: vi.fn(() => of(tag)), update: vi.fn(() => of(tag)) };

  beforeEach(() => {
    vi.clearAllMocks();
    auth.hasRole.mockReturnValue(true);
    service.add.mockReturnValue(of(tag));
    data = {};
    TestBed.configureTestingModule({ imports: [PublicationTagFormComponent, NoopAnimationsModule], providers: [
      { provide: MatDialog, useValue: dialog },
      { provide: MAT_DIALOG_DATA, useValue: data }, { provide: MatDialogRef, useValue: ref },
      { provide: AuthorizationService, useValue: auth }, { provide: PublicationTagService, useValue: service },
      { provide: ErrorPresentationService, useValue: errors },
    ] }).overrideProvider(MatDialog, { useValue: dialog });
  });

  it('creates a tag once and returns the persisted result expected by entity dialogs', async () => {
    const fixture = TestBed.createComponent(PublicationTagFormComponent);
    fixture.detectChanges();
    fixture.componentInstance.form.patchValue({ label: 'Review', description: 'Check metadata', color: '#000000' });
    expect(fixture.nativeElement.querySelector('mat-dialog-actions')).toBeNull();
    fixture.nativeElement.querySelector('app-window-toolbar [aria-label="Publikations-Tag speichern"]').click();
    await fixture.whenStable();
    expect(service.add).toHaveBeenCalledWith({ label: 'Review', description: 'Check metadata', color: '#000000' });
    expect(ref.close).toHaveBeenCalledWith({ persisted: true, mode: 'create', entity: tag });
  });

  it('loads the current entity before editing and preserves its ID', async () => {
    data.entity = { id: 7, label: 'Old row label' };
    const fixture = TestBed.createComponent(PublicationTagFormComponent);
    fixture.detectChanges();
    expect(service.getOne).toHaveBeenCalledWith(7);
    expect(fixture.componentInstance.form.controls.label.value).toBe('Review');
    fixture.componentInstance.form.controls.label.setValue('Updated');
    await fixture.componentInstance.save();
    expect(service.update).toHaveBeenCalledWith({ ...tag, label: 'Updated' });
    expect(service.add).not.toHaveBeenCalled();
  });

  it('rejects blank names and invalid colors without sending a request', async () => {
    const fixture = TestBed.createComponent(PublicationTagFormComponent);
    fixture.detectChanges();
    fixture.componentInstance.form.patchValue({ label: '  ', color: 'red' });
    await fixture.componentInstance.save();
    expect(service.add).not.toHaveBeenCalled();
    expect(ref.close).not.toHaveBeenCalled();
  });

  it('allows only admins to change the catalogue', async () => {
    auth.hasRole.mockReturnValue(false);
    data.entity = tag;
    const fixture = TestBed.createComponent(PublicationTagFormComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.form.disabled).toBe(true);
    await fixture.componentInstance.save();
    expect(service.update).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).not.toContain('Speichern');
  });

  it('keeps values and the dialog open after an API error', async () => {
    const error = { status: 409 };
    service.add.mockReturnValue(throwError(() => error));
    const fixture = TestBed.createComponent(PublicationTagFormComponent);
    fixture.detectChanges();
    fixture.componentInstance.form.controls.label.setValue('Review');
    await fixture.componentInstance.save();
    expect(errors.present).toHaveBeenCalledWith(error, expect.anything());
    expect(ref.close).not.toHaveBeenCalled();
    expect(fixture.componentInstance.saving).toBe(false);
    expect(fixture.componentInstance.form.controls.label.value).toBe('Review');
  });
  it('cancels through the standard toolbar without saving', () => {
    const fixture = TestBed.createComponent(PublicationTagFormComponent);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('app-window-toolbar [aria-label="Abbrechen"]').click();
    expect(ref.close).toHaveBeenCalledWith();
    expect(service.add).not.toHaveBeenCalled();
  });

  it('applies a color chosen in the picker and leaves it unchanged on cancellation', () => {
    dialog.open.mockReturnValueOnce({ afterClosed: () => of('#c8e6c9') });
    const fixture = TestBed.createComponent(PublicationTagFormComponent);
    fixture.detectChanges();
    fixture.componentInstance.chooseColor();
    expect(dialog.open).toHaveBeenCalledWith(TagColorDialogComponent, expect.objectContaining({ data: { color: '' } }));
    expect(fixture.componentInstance.form.controls.color.value).toBe('#c8e6c9');
    expect(fixture.componentInstance.form.controls.color.dirty).toBe(true);
    fixture.detectChanges();
    expect(getComputedStyle(fixture.nativeElement.querySelector('mat-chip')).backgroundColor).toBe('rgb(200, 230, 201)');
    dialog.open.mockReturnValueOnce({ afterClosed: () => of(undefined) });
    fixture.componentInstance.chooseColor();
    expect(fixture.componentInstance.form.controls.color.value).toBe('#c8e6c9');
    dialog.open.mockReturnValueOnce({ afterClosed: () => of(null) });
    fixture.componentInstance.chooseColor();
    expect(fixture.componentInstance.form.controls.color.value).toBe('');
  });

});
