import { Component, Inject, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { PublicationTag } from '@output/interfaces';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { PublicationTagSelectComponent } from 'src/app/shared/publication-tag-select/publication-tag-select.component';
import { WindowToolbarComponent } from 'src/app/shared/window-toolbar/window-toolbar.component';

export interface PublicationTagSelectionResult {
  ids?: number[];
  tags: PublicationTag[];
}

@Component({
  standalone: true,
  imports: [MatDialogModule, PublicationTagSelectComponent, WindowToolbarComponent],
  template: `
    <app-window-toolbar name="Publikations-Tags" [parent]="this"
      [disabled]="readonly || selector.loading || !!selector.error" />
    <mat-dialog-content>
      <app-publication-tag-select #selector [ids]="ids" [readonly]="readonly" [manageCatalog]="true"
        [showChips]="!selector.loading" (idsChange)="ids = $event" />
      @if (selector.loading) { <p role="status">Tags werden geladen …</p> }
      <p class="selection-hint">Die Zuordnung wird mit der Publikation gespeichert.</p>
    </mat-dialog-content>
  `,
  styles: ['mat-dialog-content { padding-top: 20px; } .selection-hint { font-size: 0.875rem; margin-bottom: 0; }'],
})
export class PublicationTagSelectionDialogComponent {
  @ViewChild(PublicationTagSelectComponent) selector?: PublicationTagSelectComponent;
  ids: number[];
  readonly: boolean;

  constructor(@Inject(MAT_DIALOG_DATA) data: { ids: number[] },
    private ref: MatDialogRef<PublicationTagSelectionDialogComponent, PublicationTagSelectionResult>,
    auth: AuthorizationService) {
    this.ids = [...data.ids];
    this.readonly = !['publication_writer', 'writer', 'admin'].some(role => auth.hasRole(role));
  }

  action() {
    if (this.readonly || !this.selector || this.selector.loading || this.selector.error) return;
    this.ref.close({ ids: [...this.ids], tags: this.selector.tags });
  }

  abort() {
    // Catalogue edits are already saved, even when assignment changes are cancelled.
    this.ref.close({ tags: this.selector?.tags ?? [] });
  }

  close() { this.abort(); }
}
