import { AfterViewInit, Component, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatTable, MatTableDataSource } from '@angular/material/table';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { PublicationTypeService } from 'src/app/services/entities/publication-type.service';
import { AliasPubType } from '../../../../../../output-interfaces/Alias';
import { PublicationType } from '../../../../../../output-interfaces/Publication';

@Component({
  selector: 'app-pub-type-form',
  templateUrl: './pub-type-form.component.html',
  styleUrls: ['./pub-type-form.component.css']
})
export class PubTypeFormComponent implements OnInit, AfterViewInit {

  public form: FormGroup;
  aliasForm: FormGroup = this.formBuilder.group({
    alias: ['', Validators.required]
  });

  pub_type: PublicationType;
  @ViewChild(MatTable) table: MatTable<AliasPubType>;

  constructor(public dialogRef: MatDialogRef<PubTypeFormComponent>, public tokenService: AuthorizationService,
    @Inject(MAT_DIALOG_DATA) public data: any, private formBuilder: FormBuilder, private pubTypeService: PublicationTypeService) { }

  ngAfterViewInit(): void {
    if (!this.tokenService.hasRole('writer')) {
      this.form.disable();
      this.aliasForm.disable();
    }
    if (this.data.pub_type.id) {
      this.pubTypeService.getPubType(this.data.pub_type.id).subscribe({
        next: data => {
          this.pub_type = data;
          this.form.patchValue(this.pub_type)
        }
      })
    }
    else this.pub_type = {
      label: this.data.pub_type.label,
      review: false,
      aliases: []
    }
    this.form.patchValue(this.pub_type)
  }


  ngOnInit(): void {
    this.form = this.formBuilder.group({
      id: [''],
      label: ['', Validators.required],
      review: ['']
    });
    this.form.controls.id.disable();
  }

  action() {
    this.pub_type = { ...this.pub_type, ...this.form.getRawValue() }
    this.dialogRef.close(this.pub_type)
  }

  abort() {
    this.dialogRef.close(null)
  }

  deleteAlias(elem: AliasPubType) {
    this.pub_type.aliases = this.pub_type.aliases.filter((e) => e.alias !== elem.alias)
  }

  addAlias() {
    if (this.aliasForm.invalid) return;
    this.pub_type.aliases.push({
      alias: this.aliasForm.get('alias').value.toLocaleLowerCase().trim(),
      elementId: this.pub_type.id
    })
    this.aliasForm.reset();
    if (this.table) this.table.dataSource = new MatTableDataSource<AliasPubType>(this.pub_type.aliases);
  }
}


