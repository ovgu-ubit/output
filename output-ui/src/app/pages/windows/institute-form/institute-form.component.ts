import { AfterViewInit, Component, inject, Inject, OnInit, ViewChild } from '@angular/core';
import { FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatTable } from '@angular/material/table';
import { InstituteService } from 'src/app/services/entities/institute.service';
import { AliasInstitute } from '../../../../../../output-interfaces/Alias';
import { Institute } from '../../../../../../output-interfaces/Publication';
import { AbstractFormComponent } from '../abstract-form/abstract-form.component';

@Component({
  selector: 'app-institute-form',
  templateUrl: './institute-form.component.html',
  styleUrls: ['./institute-form.component.css']
})
export class InstituteFormComponent extends AbstractFormComponent<Institute> implements OnInit, AfterViewInit {
  override name = "Institut"
  public override form: FormGroup;
  override service = inject(InstituteService)

  instForm = InstituteFormComponent;

  displayedColumns: string[] = ['id', 'label'];

  @ViewChild(MatTable) table: MatTable<AliasInstitute>;

  override fields = [
    { key: 'id', title: 'ID', type: 'number' },
    { key: 'label', title: 'Bezeichung' },
    { key: 'short_label', title: 'Kurzbezeichung' },
  ]

  constructor(
    @Inject(MAT_DIALOG_DATA) public override data: any, public override dialogRef: MatDialogRef<InstituteFormComponent>) { super(); }

  override ngOnInit(): void {
    this.form = this.formBuilder.group({
      id: [''],
      label: ['', Validators.required],
      short_label: [''],
      super_inst: ['']
    });
  }

  setSuperInst(event) {
    this.entity.super_institute = event;
  }

}
