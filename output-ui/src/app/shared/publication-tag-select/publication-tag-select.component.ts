import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PublicationTag } from '@output/interfaces';
import { AuthorizationService } from '../../security/authorization.service';
import { PublicationTagService } from '../../services/entities/publication-tag.service';
import { isPersistedEntityDialogResult } from '../../services/entities/service.interface';
import { PublicationTagFormComponent } from '../../form/publication-tag-form/publication-tag-form.component';
import { PublicationTagChipComponent } from '../publication-tag-chip/publication-tag-chip.component';

@Component({
  selector: 'app-publication-tag-select',
  standalone: true,
  imports: [ReactiveFormsModule, MatAutocompleteModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatIconModule, MatChipsModule, MatTooltipModule, PublicationTagChipComponent],
  template: `
    @if (!readonly) {
      <mat-form-field>
        <mat-label>{{multiple ? 'Tag hinzufügen' : 'Tag auswählen'}}</mat-label>
        <input matInput [formControl]="search" [matAutocomplete]="auto" [readonly]="loading || !!error" />
        @if (canManage && search.value.trim()) {
          <button type="button" matSuffix mat-icon-button (click)="editInput()" [disabled]="loading || !!error"
            [attr.aria-label]="matchingTag ? 'Tag bearbeiten' : 'Tag anlegen'"
            [matTooltip]="matchingTag ? 'Tag bearbeiten' : 'Tag anlegen'">
            <mat-icon>{{matchingTag ? 'edit' : 'add'}}</mat-icon>
          </button>
        }
        <mat-autocomplete #auto="matAutocomplete" (optionSelected)="add($event.option.value)">
          @for (tag of options; track tag.id) { <mat-option [value]="tag.id">{{tag.label}}</mat-option> }
        </mat-autocomplete>
      </mat-form-field>
    }
    @if (error) { <p role="alert">{{error}}</p> }
    @if (showChips) {
      <mat-chip-set aria-label="Ausgewählte Publikations-Tags">
        @for (tag of selected; track tag.id) {
          <app-publication-tag-chip [tag]="tag" [removable]="!readonly" (removed)="remove(tag.id!)" />
        }
      </mat-chip-set>
    }
  `,
  styles: [':host { display:block; text-align:left; } mat-form-field { width:100%; } mat-chip-set { margin-bottom:12px; }'],
})
export class PublicationTagSelectComponent implements OnInit {
  @Input() ids: number[] = [];
  @Input() readonly = false;
  @Input() multiple = true;
  @Input() showChips = true;
  @Input() manageCatalog = false;
  @Output() idsChange = new EventEmitter<number[]>();
  tags: PublicationTag[] = [];
  search = new FormControl('', { nonNullable: true });
  loading = true;
  error = '';
  constructor(private service: PublicationTagService, private dialog: MatDialog, private auth: AuthorizationService) { }

  ngOnInit() {
    this.service.getAll().subscribe({
      next: tags => { this.tags = tags; this.loading = false; },
      error: () => { this.loading = false; this.error = 'Tags konnten nicht geladen werden.'; },
    });
  }

  get canManage() { return this.manageCatalog && this.auth.hasRole('admin'); }
  get matchingTag() { return this.tags.find(tag => tag.label.toLocaleLowerCase('de') === this.search.value.trim().toLocaleLowerCase('de')); }
  get options() {
    const query = this.search.value.trim().toLocaleLowerCase('de');
    return this.tags.filter(tag => (!this.multiple || !this.ids.includes(tag.id!)) && tag.label.toLocaleLowerCase('de').includes(query));
  }
  get selected(): PublicationTag[] {
    return this.ids.map(id => this.tags.find(tag => tag.id === id) ?? { id, label: `Gelöschter Tag #${id}` });
  }

  add(id: number) {
    if (this.readonly || this.loading || this.error || !this.tags.some(tag => tag.id === id)) return;
    const next = this.multiple ? [...new Set([...this.ids, id])] : [id];
    this.search.setValue('');
    if (next.length !== this.ids.length || next.some((value, index) => value !== this.ids[index])) this.idsChange.emit(next);
  }

  remove(id: number) {
    if (!this.readonly) this.idsChange.emit(this.ids.filter(value => value !== id));
  }

  editInput() {
    this.edit(this.matchingTag ?? { label: this.search.value.trim() });
  }

  edit(tag: PublicationTag) {
    if (this.readonly || !this.canManage) return;
    this.dialog.open(PublicationTagFormComponent, { width: '600px', maxHeight: '90vh',
      data: { entity: tag, persistOnSave: true }, disableClose: true }).afterClosed().subscribe(result => {
      if (!isPersistedEntityDialogResult<PublicationTag>(result)) return;
      this.tags = [...this.tags.filter(value => value.id !== result.entity.id), result.entity]
        .sort((a, b) => a.label.localeCompare(b.label, 'de'));
      if (result.mode === 'create') this.add(result.entity.id!);
    });
  }
}
