import { AfterViewInit, Component, inject, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { Observable, map, startWith } from 'rxjs';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { InstituteService } from 'src/app/services/entities/institute.service';
import { AliasInstitute } from '../../../../../../output-interfaces/Alias';
import { Institute } from '../../../../../../output-interfaces/Publication';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmDialogComponent, ConfirmDialogModel } from 'src/app/tools/confirm-dialog/confirm-dialog.component';
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
    // { key: 'inst', title: 'Institute', type: 'institute' },
    // { key: 'alias_first', title: 'Aliase Vorname', type: 'alias' },
    // { key: 'alias_last', title: 'Aliase Nachname', type: 'alias' },
  ]

  constructor(
    @Inject(MAT_DIALOG_DATA) public override data: any, public override dialogRef: MatDialogRef<InstituteFormComponent>) { super(); }

  override ngOnInit(): void {
    this.form = this.formBuilder.group({
      id: [''],
      title: [''],
      label: ['', Validators.required],
      short_label: [''],
      super_inst: ['']
    });
  }

  setSuperInst(event) {
    this.entity.super_institute = event;
  }

}
