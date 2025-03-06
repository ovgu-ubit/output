import { Component, inject, Input, Output, ViewChild } from '@angular/core';
import { EventEmitter } from 'stream';
import { Identifiable, Identifier, IIdentifier } from '../../../../../output-interfaces/Publication';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-id-table',
  templateUrl: './id-table.component.html',
  styleUrl: './id-table.component.css'
})
export class IdTableComponent<T extends Identifiable<T>> {

  @Input()
  disabled: boolean;

  @Input()
  entity: T

  idForm = inject(FormBuilder).group({
    type: ['', Validators.required],
    value: ['', Validators.required]
  })

  @ViewChild(MatTable) idTable: MatTable<IIdentifier<T>>;

  public isDirty() {
    return this.idForm.dirty;
  }

  deleteId(elem) {
    if (this.disabled) return;
    this.entity.identifiers = this.entity.identifiers.filter(e => e.id !== elem.id)
  }
  addId() {
    if (this.disabled || this.idForm.invalid) return;
    if (!this.entity.identifiers) this.entity.identifiers = [];
    this.entity.identifiers.push({
      type: this.idForm.get('type').value,
      value: this.idForm.get('value').value
    })
    this.idForm.reset();
    if (this.idTable) this.idTable.dataSource = new MatTableDataSource<IIdentifier<T>>(this.entity.identifiers);
  }
}
