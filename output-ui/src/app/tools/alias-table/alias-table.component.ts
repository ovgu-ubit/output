import { Component, inject, Input, ViewChild } from '@angular/core';
import { Alias, Aliasable } from '../../../../../output-interfaces/Alias';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTable, MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-alias-table',
  templateUrl: './alias-table.component.html',
  styleUrl: './alias-table.component.css'
})
export class AliasTableComponent<T extends Aliasable<T>> {

  @Input()
  name: string;

  @Input()
  disabled: boolean;

  @Input()
  entity: T
  
  aliasForm: FormGroup = inject(FormBuilder).group({
    alias: ['', Validators.required]
  });
  
  @ViewChild(MatTable) table: MatTable<Alias<T>>;

  deleteAlias(elem: Alias<T>) {
    if (this.disabled) return;
    this.entity.aliases = this.entity.aliases.filter((e) => e.alias !== elem.alias)
  }

  addAlias() {
    if (this.disabled) return;
    if (this.aliasForm.invalid) return;
    if (!this.entity.aliases) this.entity.aliases = [];
    this.entity.aliases.push({
      alias: this.aliasForm.get('alias').value.toLocaleLowerCase().trim(),
      elementId: this.entity.id
    })
    this.aliasForm.reset();
    if (this.table) this.table.dataSource = new MatTableDataSource<Alias<T>>(this.entity.aliases);
  }
}
