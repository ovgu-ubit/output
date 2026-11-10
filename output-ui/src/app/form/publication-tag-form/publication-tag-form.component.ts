import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { WindowToolbarComponent } from '../../shared/window-toolbar/window-toolbar.component';
import { TagColorDialogComponent } from './tag-color-dialog.component';
import { firstValueFrom } from 'rxjs';
import { PublicationTag } from '@output/interfaces';
import { PublicationTagService } from '../../services/entities/publication-tag.service';
import { AuthorizationService } from '../../security/authorization.service';
import { ErrorPresentationService } from '../../core/errors/error-presentation.service';
import { PublicationTagChipComponent } from '../../shared/publication-tag-chip/publication-tag-chip.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatChipsModule, MatFormFieldModule,
    MatInputModule, WindowToolbarComponent, PublicationTagChipComponent],
  template: `
    <app-window-toolbar name="Publikations-Tag" [parent]="this" [disabled]="readonly || loading" />
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content>
        @if (data.entity?.id !== undefined) {
          <mat-form-field><mat-label>ID</mat-label><input matInput [value]="data.entity.id" readonly /></mat-form-field>
        }
        <mat-form-field><mat-label>Bezeichnung</mat-label><input matInput formControlName="label" required />
          @if (form.controls.label.invalid) { <mat-error>Bitte eine Bezeichnung eingeben.</mat-error> }
        </mat-form-field>
        <mat-form-field><mat-label>Beschreibung</mat-label><textarea matInput formControlName="description"></textarea></mat-form-field>
        <mat-form-field><mat-label>Farbe (#RRGGBB)</mat-label><input matInput formControlName="color" />
          @if (form.controls.color.invalid) { <mat-error>Bitte einen Hex-Farbwert eingeben.</mat-error> }
        </mat-form-field>
        @if (!readonly) {
          <button mat-stroked-button type="button" (click)="chooseColor()" [disabled]="loading || saving">Farbe auswählen</button>
        }
        <mat-chip-set aria-label="Tag-Vorschau"><app-publication-tag-chip [tag]="preview" /></mat-chip-set>
      </mat-dialog-content>
    </form>
  `,
  styles: ['mat-dialog-content { display:flex; flex-direction:column; gap:8px; }'],
})
export class PublicationTagFormComponent implements OnInit {
  form: FormGroup<{ label: FormControl<string>; description: FormControl<string>; color: FormControl<string> }>;
  saving = false;
  loading = false;
  readonly: boolean;

  constructor(@Inject(MAT_DIALOG_DATA) public data: { entity?: PublicationTag; locked?: boolean },
    public ref: MatDialogRef<PublicationTagFormComponent>, private service: PublicationTagService,
    builder: FormBuilder, auth: AuthorizationService, private errors: ErrorPresentationService, private dialog: MatDialog) {
    this.readonly = !auth.hasRole('admin') || !!data.locked;
    this.form = builder.nonNullable.group({ label: ['', [Validators.required, Validators.pattern(/\S/)]],
      description: [''], color: ['', Validators.pattern(/^#[0-9a-fA-F]{6}$/)] });
    this.patch(data.entity);
    if (this.readonly) this.form.disable();
  }

  ngOnInit() {
    if (this.data.entity?.id === undefined) return;
    this.loading = true;
    this.service.getOne(this.data.entity.id).subscribe({
      next: tag => { this.patch(tag); this.loading = false; },
      error: error => { this.errors.present(error, { action: 'load', entity: 'Publikations-Tag' }); this.ref.close(); },
    });
  }

  private patch(tag?: PublicationTag) {
    this.form.patchValue({ label: tag?.label ?? '', description: tag?.description ?? '', color: tag?.color ?? '' });
  }

  get preview(): PublicationTag { return { ...this.form.getRawValue(), label: this.form.controls.label.value || 'Tag' }; }

  action() { return this.save(); }
  abort() { if (!this.saving) this.ref.close(); }
  close() { this.abort(); }

  chooseColor() {
    if (this.readonly || this.loading || this.saving) return;
    this.dialog.open(TagColorDialogComponent, { width: '400px', maxHeight: '90vh', data: { color: this.form.controls.color.value } })
      .afterClosed().subscribe((color: string | null | undefined) => {
        if (color === undefined) return;
        this.form.controls.color.setValue(color ?? '');
        this.form.controls.color.markAsDirty();
      });
  }

  async save() {
    if (this.readonly || this.loading || this.saving) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.saving = true;
    this.errors.clearFieldErrors(this.form);
    const id = this.data.entity?.id;
    const value: PublicationTag = { ...this.form.getRawValue(), ...(id === undefined ? {} : { id }) };
    try {
      const entity = await firstValueFrom(id === undefined ? this.service.add(value) : this.service.update(value));
      this.ref.close({ persisted: true, mode: id === undefined ? 'create' : 'update', entity });
    } catch (error) {
      this.errors.applyFieldErrors(this.form, error);
      this.errors.present(error, { action: 'save', entity: 'Publikations-Tag' });
    } finally { this.saving = false; }
  }
}
