import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { PublicationService } from 'src/app/services/entities/publication.service';
import { PublicationChange } from '../../../../../../output-interfaces/Workflow';

type PublicationChangePatch = {
  action?: string;
  before?: unknown;
  after?: unknown;
};

type PublicationChangeRow = {
  key: string;
  label: string;
  before: string;
  after: string;
};

type PublicationChangeEntry = {
  change: PublicationChange;
  rows: PublicationChangeRow[];
};

@Component({
  selector: 'app-publication-change-log',
  templateUrl: './publication-change-log.component.html',
  styleUrls: ['./publication-change-log.component.css'],
  standalone: false
})
export class PublicationChangeLogComponent implements OnChanges {
  @Input() publicationId?: number | null;

  changeEntries: PublicationChangeEntry[] = [];
  loading = false;
  errorMessage = '';

  private readonly keyLabels: Record<string, string> = {
    authors: 'Autor*innen',
    title: 'Titel',
    doi: 'DOI',
    pub_date: 'Publikationsdatum',
    pub_date_print: 'Publikationsdatum (print)',
    pub_date_submitted: 'Einreichungsdatum',
    pub_date_accepted: 'Akzeptanzdatum',
    link: 'Link',
    dataSource: 'Datenquelle',
    language: 'Sprache',
    add_info: 'Weitere Informationen',
    status: 'Status',
    is_oa: 'Ist OA?',
    oa_status: 'OA-Status',
    is_journal_oa: 'Journal OA',
    best_oa_host: 'Beste OA Quelle',
    best_oa_license: 'Beste OA Lizenz',
    abstract: 'Abstract',
    volume: 'Volume',
    issue: 'Issue',
    first_page: 'Erste Seite',
    last_page: 'Letzte Seite',
    publisher_location: 'Verlagsort',
    edition: 'Ausgabe',
    article_number: 'Artikelnummer',
    page_count: 'Seitenzahl',
    peer_reviewed: 'Peer-reviewed',
    cost_approach: 'Kostenansatz',
    cost_approach_currency: 'Währung',
    not_budget_relevant: 'Nicht budgetrelevant',
    grant_number: 'Fördernummer',
    contract_year: 'Vertragsjahr',
    pub_type: 'Publikationstyp',
    oa_category: 'OA-Kategorie',
    greater_entity: 'Größere Einheit',
    publisher: 'Verlag',
    contract: 'Vertrag',
    funders: 'Förderer',
    invoices: 'Rechnungen',
    identifiers: 'Identifikatoren',
    supplements: 'Ressourcen',
  };

  constructor(private publicationService: PublicationService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (!('publicationId' in changes)) return;
    if (!this.publicationId) {
      this.changeEntries = [];
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
        return 'Geändert';
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
        this.changeEntries = changes.map((change) => ({
          change,
          rows: this.buildRows(change),
        }));
        this.loading = false;
      },
      error: () => {
        this.changeEntries = [];
        this.errorMessage = 'Änderungslog konnte nicht geladen werden.';
        this.loading = false;
      }
    });
  }

  private getPatch(change: PublicationChange): PublicationChangePatch | null {
    if (!change.patch_data || typeof change.patch_data !== 'object') return null;
    return change.patch_data as PublicationChangePatch;
  }

  private buildRows(change: PublicationChange): PublicationChangeRow[] {
    const patch = this.getPatch(change);
    const before = this.toRecord(patch?.before);
    const after = this.toRecord(patch?.after);
    const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));

    return keys.map((key) => ({
      key,
      label: this.keyLabels[key] ?? this.humanizeKey(key),
      before: this.formatChangeValue(before[key]),
      after: this.formatChangeValue(after[key]),
    }));
  }

  private toRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as Record<string, unknown>;
  }

  private formatChangeValue(value: unknown): string {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'string') return this.formatStringValue(value);
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return value ? 'Ja' : 'Nein';
    if (Array.isArray(value)) {
      if (value.length === 0) return '—';
      return value.map((entry) => this.formatComplexValue(entry)).join('\n');
    }
    return this.formatComplexValue(value);
  }

  private formatComplexValue(value: unknown): string {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'string') return this.formatStringValue(value);
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return value ? 'Ja' : 'Nein';
    if (Array.isArray(value)) return value.map((entry) => this.formatComplexValue(entry)).join('\n');
    if (typeof value !== 'object') return String(value);

    const record = value as Record<string, unknown>;
    if (typeof record.label === 'string') {
      return record.id ? `${record.label} (#${record.id})` : record.label;
    }
    if (typeof record.type === 'string' && typeof record.value === 'string') {
      return `${record.type}: ${record.value}`;
    }
    if (typeof record.number === 'string') {
      return record.id ? `#${record.id}: ${record.number}` : record.number;
    }

    return Object.entries(record)
      .map(([key, entryValue]) => `${this.keyLabels[key] ?? this.humanizeKey(key)}: ${this.formatInlineValue(entryValue)}`)
      .join(', ');
  }

  private formatInlineValue(value: unknown): string {
    const formatted = this.formatChangeValue(value);
    return formatted.replace(/\n/g, '; ');
  }

  private formatStringValue(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return '—';

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime()) && /^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
      return new Intl.DateTimeFormat('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(parsed);
    }

    return value;
  }

  private humanizeKey(key: string): string {
    return key
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/_/g, ' ')
      .replace(/^./, (char) => char.toUpperCase());
  }
}
