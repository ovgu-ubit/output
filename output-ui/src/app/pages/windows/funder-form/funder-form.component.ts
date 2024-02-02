import { Component, OnInit, Inject,ViewChild,AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Funder } from '../../../../../../output-interfaces/Publication';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FunderService } from 'src/app/services/entities/funder.service';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { AliasFunder } from '../../../../../../output-interfaces/Alias';
import { AuthorizationService } from 'src/app/security/authorization.service';

@Component({
  selector: 'app-funder-form',
  templateUrl: './funder-form.component.html',
  styleUrls: ['./funder-form.component.css']
})
export class FunderFormComponent implements OnInit, AfterViewInit {

  public form: FormGroup;
  aliasForm :FormGroup = this.formBuilder.group({
    alias: ['', Validators.required]
  });

  @ViewChild(MatTable) table: MatTable<AliasFunder>;

  funder: Funder;

  constructor(public dialogRef: MatDialogRef<FunderFormComponent>, public tokenService: AuthorizationService,
    @Inject(MAT_DIALOG_DATA) public data: any, private formBuilder: FormBuilder, private funderService:FunderService) {}

  ngAfterViewInit(): void {
    if (!this.tokenService.hasRole('writer')) {
      this.form.disable();
      this.aliasForm.disable();
    }
    if (this.data.funder?.id) {
      this.funderService.getFunder(this.data.funder.id).subscribe({
        next: data => {
          this.funder = data;
          this.form.patchValue(this.funder)
        }
      })
    }
    else this.funder = {
      label : this.data.funder.label,
      aliases: []
    }
    this.form.patchValue(this.funder)
  }

  ngOnInit(): void {
    this.form = this.formBuilder.group({
      id: [''],
      label: ['', Validators.required],
      doi: [''],
    });
    this.form.controls.id.disable();
  }

  action() {
    if (this.form.invalid) return;
    this.funder = {...this.funder, ...this.form.getRawValue()}
    if (!this.funder.id) this.funder.id = undefined;
    if (!this.funder.doi) this.funder.doi = undefined;
    this.dialogRef.close(this.funder)
  }

  abort() {
    this.dialogRef.close(null)
  }

  deleteAlias(elem:AliasFunder) {
    this.funder.aliases = this.funder.aliases.filter((e) => e.alias !== elem.alias)
  }

  addAlias() {
    if (this.aliasForm.invalid) return;
    this.funder.aliases.push({
      alias: this.aliasForm.get('alias').value.toLocaleLowerCase().trim(),
      elementId: this.funder.id
    })
    this.aliasForm.reset();
    if (this.table) this.table.dataSource = new MatTableDataSource<AliasFunder>(this.funder.aliases);
  }
}
