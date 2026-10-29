import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-table-filter',
  template: `
    <div style="display: flex; flex-direction: row;justify-content: flex-start; gap: 10px">
      <mat-form-field>
        <input matInput type="text" [formControl]="searchControl" placeholder="Alle Spalten filtern">
        @if (searchControl.value) {
          <button type="button" matSuffix mat-icon-button aria-label="Clear"
            (click)="searchControl.setValue('')">
            <mat-icon>close</mat-icon>
          </button>
        }
      </mat-form-field>
    </div>
    `,
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: false
})
export class TableFilterComponent {
  @Input() searchControl: FormControl;
}
