import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { WindowToolbarComponent } from '../../shared/window-toolbar/window-toolbar.component';
import { PublicationTagChipComponent } from '../../shared/publication-tag-chip/publication-tag-chip.component';

@Component({
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatChipsModule, MatTooltipModule, WindowToolbarComponent, PublicationTagChipComponent],
  template: `
    <app-window-toolbar name="Tag-Farbe" [parent]="this" [disabled]="false" />
    <mat-dialog-content>
      <div class="palette" role="group" aria-label="Farbauswahl">
        @for (option of palette; track option.color) {
          <button type="button" class="swatch" [style.background-color]="option.color" [class.selected]="color === option.color"
            [attr.aria-label]="option.label" [attr.aria-pressed]="color === option.color" [matTooltip]="option.label"
            (click)="color = option.color"></button>
        }
      </div>
      <label class="custom-color">Eigene Farbe
        <input type="color" aria-label="Eigene Farbe" [value]="color || '#e0e0e0'" (input)="color = $any($event.target).value" />
      </label>
      <button type="button" mat-button (click)="color = null">Keine Farbe</button>
      <mat-chip-set aria-label="Farbvorschau"><app-publication-tag-chip [tag]="{ label: 'Vorschau', color: color }" /></mat-chip-set>
    </mat-dialog-content>
  `,
  styles: [`
    mat-dialog-content { display:flex; flex-direction:column; gap:20px; }
    .palette { display:grid; grid-template-columns:repeat(6, 1fr); gap:12px; padding:4px; }
    .swatch { width:100%; aspect-ratio:1; border:1px solid #777; border-radius:6px; cursor:pointer; }
    .swatch.selected { outline:3px solid #333; outline-offset:2px; }
    .swatch:focus-visible { outline:3px solid #1565c0; outline-offset:2px; }
    .custom-color { display:flex; align-items:center; justify-content:space-between; gap:16px; }
  `],
})
export class TagColorDialogComponent {
  color: string | null;
  readonly palette = [
    { label: 'Rot', color: '#ffcdd2' }, { label: 'Rosa', color: '#f8bbd0' }, { label: 'Violett', color: '#e1bee7' },
    { label: 'Indigo', color: '#d1c4e9' }, { label: 'Blau', color: '#bbdefb' }, { label: 'Türkis', color: '#b2ebf2' },
    { label: 'Petrol', color: '#b2dfdb' }, { label: 'Grün', color: '#c8e6c9' }, { label: 'Gelb', color: '#fff9c4' },
    { label: 'Orange', color: '#ffe0b2' }, { label: 'Braun', color: '#d7ccc8' }, { label: 'Grau', color: '#cfd8dc' },
  ];

  constructor(@Inject(MAT_DIALOG_DATA) data: { color?: string | null }, private ref: MatDialogRef<TagColorDialogComponent>) {
    this.color = /^#[0-9a-f]{6}$/i.test(data.color ?? '') ? data.color! : null;
  }

  action() { this.ref.close(this.color); }
  abort() { this.ref.close(); }
  close() { this.abort(); }
}
