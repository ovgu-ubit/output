import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { PublicationChange } from '../../../../../../output-interfaces/Workflow';

type PublicationChangePatch = {
  action?: string;
  before?: unknown;
  after?: unknown;
};

@Component({
  selector: 'app-publication-change-log',
  templateUrl: './publication-change-log.component.html',
  styleUrls: ['./publication-change-log.component.css'],
  standalone: false
})
export class PublicationChangeLogComponent implements OnChanges {
  @Input() publicationId?: number | null;

  changes: PublicationChange[] = [];
  loading = false;
  errorMessage = '';

  constructor(private publicationService: PublicationService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (!('publicationId' in changes)) return;
    if (!this.publicationId) {
      this.changes = [];
      this.errorMessage = '';
      this.loading = false;
      return;
    }
    this.loadChanges(this.publicationId);
  }

  getActionLabel(change: PublicationChange): string {
    switch (this.getPatch(change)?.action) {
      case 'create':
        return 'Erstellt';
      case 'update':
        return 'Aktualisiert';
      default:
        return 'Geaendert';
    }
  }

  getPublicationChangeId(change: PublicationChange): number | undefined {
    return change.publication?.id ?? change.publicationId;
  }

  private loadChanges(publicationId: number): void {
    this.loading = true;
    this.errorMessage = '';
    this.publicationService.getChanges(publicationId).subscribe({
      next: (changes) => {
        this.changes = changes;
        this.loading = false;
      },
      error: () => {
        this.changes = [];
        this.errorMessage = 'Änderungslog konnte nicht geladen werden.';
        this.loading = false;
      }
    });
  }

  private getPatch(change: PublicationChange): PublicationChangePatch | null {
    if (!change.patch_data || typeof change.patch_data !== 'object') return null;
    return change.patch_data as PublicationChangePatch;
  }
}
