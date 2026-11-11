import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TagColorDialogComponent } from './tag-color-dialog.component';

describe('Tag color selection', () => {
  const ref = { close: vi.fn() };
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({ imports: [TagColorDialogComponent, NoopAnimationsModule], providers: [
      { provide: MAT_DIALOG_DATA, useValue: { color: '#000000' } }, { provide: MatDialogRef, useValue: ref },
    ] });
  });

  it('selects a palette color and confirms through the toolbar', () => {
    const fixture = TestBed.createComponent(TagColorDialogComponent);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[aria-label="Grün"]').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Grün"]').getAttribute('aria-pressed')).toBe('true');
    expect(ref.close).not.toHaveBeenCalled();
    fixture.nativeElement.querySelector('[aria-label="Tag-Farbe speichern"]').click();
    expect(ref.close).toHaveBeenCalledWith('#c8e6c9');
  });

  it('previews custom colors and allows clearing the color', () => {
    const fixture = TestBed.createComponent(TagColorDialogComponent);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input[type="color"]');
    input.value = '#123456';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(getComputedStyle(fixture.nativeElement.querySelector('mat-chip')).backgroundColor).toBe('rgb(18, 52, 86)');
    const clear = [...fixture.nativeElement.querySelectorAll('button')].find((button: HTMLButtonElement) => button.textContent.includes('Keine Farbe')) as HTMLButtonElement;
    clear.click();
    fixture.nativeElement.querySelector('[aria-label="Tag-Farbe speichern"]').click();
    expect(ref.close).toHaveBeenCalledWith(null);
  });

  it('cancels without returning a new color', () => {
    const fixture = TestBed.createComponent(TagColorDialogComponent);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('[aria-label="Abbrechen"]').click();
    expect(ref.close).toHaveBeenCalledWith();
  });
});
