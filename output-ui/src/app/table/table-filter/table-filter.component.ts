import { Component, Input } from '@angular/core';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-table-filter',
  template: `
    <div style="display: flex; flex-direction: row;justify-content: flex-start; gap: 10px">
      <mat-form-field>
        <input matInput type="text" [formControl]="searchControl" placeholder="Alle Spalten filtern">
        <button type="button" *ngIf="searchControl.value" matSuffix mat-icon-button aria-label="Clear"
          (click)="searchControl.setValue('')">
          <mat-icon>close</mat-icon>
        </button>
      </mat-form-field>
    </div>
  `,
  standalone: false
})
export class TableFilterComponent {
  @Input() searchControl: FormControl;
}
