import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PublicationTag } from '@output/interfaces';

@Component({
  selector: 'app-publication-tag-chip',
  standalone: true,
  imports: [MatChipsModule, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-chip [removable]="removable" (removed)="removed.emit()" [matTooltip]="tag.description || tag.label"
      [style.background-color]="background" [style.color]="foreground"
      [style.--mat-chip-elevated-container-color]="background"
      [style.--mat-chip-label-text-color]="foreground"
      [style.--mat-chip-with-trailing-icon-trailing-icon-color]="foreground">
      {{tag.label}}
      @if (removable) {
        <button type="button" matChipRemove [style.color]="foreground"
          [attr.aria-label]="'Tag ' + tag.label + ' entfernen'" matTooltip="Tag entfernen">
          <mat-icon>cancel</mat-icon>
        </button>
      }
    </mat-chip>
  `,
  styles: [':host { display: inline-flex; max-width: 100%; } mat-chip { --mat-chip-outline-color: transparent; }'],
})
export class PublicationTagChipComponent {
  @Input({ required: true }) tag: PublicationTag;
  @Input() removable = false;
  @Output() removed = new EventEmitter<void>();

  get background(): string {
    return /^#[0-9a-f]{6}$/i.test(this.tag.color ?? '') ? this.tag.color! : '#e0e0e0';
  }

  get foreground(): string {
    const channels = [1, 3, 5].map(offset => parseInt(this.background.slice(offset, offset + 2), 16) / 255)
      .map(channel => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? '#000000' : '#ffffff';
  }
}
