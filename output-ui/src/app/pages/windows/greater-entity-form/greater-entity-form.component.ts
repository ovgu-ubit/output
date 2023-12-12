import { AfterViewInit, Component, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { GreaterEntityService } from 'src/app/services/entities/greater-entity.service';
import { GreaterEntity, Identifier } from '../../../../../../output-interfaces/Publication';

@Component({
  selector: 'app-greater-entity-form',
  templateUrl: './greater-entity-form.component.html',
  styleUrls: ['./greater-entity-form.component.css']
})
export class GreaterEntityFormComponent implements OnInit, AfterViewInit {

  public form: FormGroup;
  public idForm: FormGroup;

  ge: GreaterEntity;

  displayedColumns: string[] = ['type', 'value', 'delete'];
  @ViewChild(MatTable) table: MatTable<Identifier>;

  constructor(public dialogRef: MatDialogRef<GreaterEntityFormComponent>, public tokenService: AuthorizationService,
    @Inject(MAT_DIALOG_DATA) public data: any, private formBuilder: FormBuilder, private geService: GreaterEntityService) { }

  ngAfterViewInit(): void {
    if (!this.tokenService.hasRole('writer')) {
      this.form.disable();
      this.idForm.disable();
    }
    if (this.data.greater_entity.id) {
      this.geService.getGreaterEntity(this.data.greater_entity.id).subscribe({
        next: data => {
          this.ge = data;
          this.form.patchValue(this.ge)
        }
      })
    }
    else this.ge = {
      label: this.data.greater_entity.label,
      identifiers: []
    }
    this.form.patchValue(this.ge)
  }


  ngOnInit(): void {
    this.form = this.formBuilder.group({
      id: [''],
      label: ['', Validators.required],
      rating: [''],
      is_doaj: [''],
    });
    this.form.controls.id.disable();
    this.idForm = this.formBuilder.group({
      type: ['', Validators.required],
      value: ['', Validators.required]
    })
  }

  action() {
    this.ge = { ...this.ge, ...this.form.getRawValue() }
    this.dialogRef.close(this.ge)
  }

  abort() {
    this.dialogRef.close(null)
  }

  deleteId(elem) {
    this.ge.identifiers = this.ge.identifiers.filter(e => e.id !== elem.id)
  }
  addId() {
    this.ge.identifiers.push({
      type: this.idForm.get('type').value,
      value: this.idForm.get('value').value
    })
    this.idForm.reset();
    this.table.dataSource = new MatTableDataSource<Identifier>(this.ge.identifiers);
  }
}
