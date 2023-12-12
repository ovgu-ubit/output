import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { OACategoryService } from 'src/app/services/entities/oa-category.service';
import { OA_Category } from '../../../../../../output-interfaces/Publication';

@Component({
  selector: 'app-oa-category-form',
  templateUrl: './oa-category-form.component.html',
  styleUrls: ['./oa-category-form.component.css']
})
export class OaCategoryFormComponent implements OnInit, AfterViewInit{

  public form: FormGroup;

  oa_category:OA_Category;

  constructor(public dialogRef: MatDialogRef<OaCategoryFormComponent>, public tokenService: AuthorizationService,
    @Inject(MAT_DIALOG_DATA) public data: any, private formBuilder: FormBuilder, private oaService:OACategoryService) {}

  ngAfterViewInit(): void {
    if (!this.tokenService.hasRole('writer')) {
      this.form.disable();
    }
    if (this.data.oa_category.id) {
      this.oaService.getOACategory(this.data.oa_category.id).subscribe({
        next: data => {
          this.oa_category = data;
          this.form.patchValue(this.oa_category)
        }
      })
    }
    else this.oa_category = {
      label: this.data.oa_category.label,
      is_oa: false
    }
    this.form.patchValue(this.oa_category)
  }


  ngOnInit(): void {
    this.form = this.formBuilder.group({
      id: [''],
      label: ['', Validators.required],
      is_oa: ['']
    });
    this.form.controls.id.disable();
  }

  action() {
    this.oa_category = {...this.oa_category, ...this.form.getRawValue()}
    this.dialogRef.close(this.oa_category)
  }

  abort() {
    this.dialogRef.close(null)
  }
}



