import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { PublicationTagChipComponent } from './publication-tag-chip.component';

describe('Publication tag colors', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [PublicationTagChipComponent, NoopAnimationsModule] }));

  it.each([
    ['#ffffff', 'rgb(255, 255, 255)', 'rgb(0, 0, 0)'], ['#000000', 'rgb(0, 0, 0)', 'rgb(255, 255, 255)'],
    ['#ff0000', 'rgb(255, 0, 0)', 'rgb(0, 0, 0)'], ['#0000ff', 'rgb(0, 0, 255)', 'rgb(255, 255, 255)'], ['#808080', 'rgb(128, 128, 128)', 'rgb(0, 0, 0)'],
  ])('renders %s with a readable label and remove icon', (color, background, foreground) => {
    const fixture = TestBed.createComponent(PublicationTagChipComponent);
    fixture.componentRef.setInput('tag', { id: 1, label: 'Review', color });
    fixture.componentRef.setInput('removable', true);
    fixture.detectChanges();
    const chip = fixture.nativeElement.querySelector('mat-chip');
    const label = chip.querySelector('.mdc-evolution-chip__text-label');
    expect(getComputedStyle(chip).backgroundColor).toBe(background);
    expect(getComputedStyle(label).color).toBe(foreground);
    expect(getComputedStyle(chip.querySelector('button')).color).toBe(foreground);
  });

  it('uses a neutral background and only offers chip removal', () => {
    const fixture = TestBed.createComponent(PublicationTagChipComponent);
    fixture.componentRef.setInput('tag', { id: 1, label: 'Review' });
    fixture.componentRef.setInput('removable', true);
    const remove = vi.fn();
    fixture.componentInstance.removed.subscribe(remove);
    fixture.detectChanges();
    expect(getComputedStyle(fixture.nativeElement.querySelector('mat-chip')).backgroundColor).toBe('rgb(224, 224, 224)');
    expect(fixture.nativeElement.querySelector('[aria-label="Tag Review bearbeiten"]')).toBeNull();
    fixture.nativeElement.querySelector('[aria-label="Tag Review entfernen"]').click();
    expect(remove).toHaveBeenCalledOnce();
  });

  it('shows only the appropriate tooltip when moving between the label and remove button', async () => {
    const fixture = TestBed.createComponent(PublicationTagChipComponent);
    fixture.componentRef.setInput('tag', { id: 1, label: 'Review', description: 'Beleg nachfordern' });
    fixture.componentRef.setInput('removable', true);
    fixture.detectChanges();
    const chip = fixture.nativeElement.querySelector('mat-chip');
    const textLabel = chip.querySelector('.mdc-evolution-chip__text-label');
    const label = textLabel.querySelector('span') ?? textLabel;
    const remove = fixture.nativeElement.querySelector('[aria-label="Tag Review entfernen"]');
    const tooltipTexts = () => {
      fixture.detectChanges();
      return [...document.querySelectorAll('.mat-mdc-tooltip-surface')].map(tooltip => tooltip.textContent.trim());
    };

    chip.dispatchEvent(new MouseEvent('mouseenter'));
    label.dispatchEvent(new MouseEvent('mouseenter'));
    await vi.waitFor(() => expect(tooltipTexts()).toEqual(['Beleg nachfordern']));
    label.dispatchEvent(new MouseEvent('mouseleave', { relatedTarget: remove }));
    remove.dispatchEvent(new MouseEvent('mouseenter'));
    await vi.waitFor(() => expect(tooltipTexts()).toEqual(['Tag entfernen']));
    remove.dispatchEvent(new MouseEvent('mouseleave', { relatedTarget: label }));
    label.dispatchEvent(new MouseEvent('mouseenter'));
    await vi.waitFor(() => expect(tooltipTexts()).toEqual(['Beleg nachfordern']));
    label.dispatchEvent(new MouseEvent('mouseleave'));
    chip.dispatchEvent(new MouseEvent('mouseleave'));
    await vi.waitFor(() => expect(tooltipTexts()).toEqual([]));
  });
});
