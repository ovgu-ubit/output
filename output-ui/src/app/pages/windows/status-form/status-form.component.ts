import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Observable, map } from 'rxjs';
import { StatusService } from 'src/app/services/entities/status.service';
import { Status } from '../../../../../../output-interfaces/Publication';
import { AbstractFormComponent } from '../abstract-form/abstract-form.component';

export function createUniqueValidator(statuses: Status[]): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.get('id').value;
    if (!value) {
      return null;
    }
    let status_notUnique = statuses.find(e => e.id == value)
    //pattern non-negative
    let status_pattern = value < 0;
    return status_notUnique || status_pattern ? { status_notUnique, status_pattern } : null;
  }
}

@Component({
  selector: 'app-status-form',
  templateUrl: './status-form.component.html',
  styleUrl: './status-form.component.css'
})
export class StatusFormComponent implements OnInit {
  name = "Status"
  fields = [
    { key: 'id', title: 'Status', type: 'status', required: true },
    { key: 'label', title: 'Bezeichnung', required: true },
    { key: 'description', title: 'Beschreibung' },
  ]
  statuses: Status[];
  @ViewChild(AbstractFormComponent) formC;

  constructor(public dialogRef: MatDialogRef<StatusFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any, public service: StatusService) { }

  preProcessing(): Observable<any> {
    return this.service.getAll().pipe(map(
      data => {
        this.statuses = data;
        if (this.data.status?.id !== undefined && this.data.status?.id !== null) this.statuses = this.statuses.filter(e => e.id !== this.data.status.id)
        this.formC.validator = createUniqueValidator(this.statuses)
      }
    ))
  }

  ngOnInit(): void {
  }
}

