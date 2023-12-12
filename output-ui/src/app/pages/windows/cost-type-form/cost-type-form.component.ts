import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { CostTypeService } from 'src/app/services/entities/cost-type.service';
import { CostType } from '../../../../../../output-interfaces/Publication';

@Component({
  selector: 'app-cost-type-form',
  templateUrl: './cost-type-form.component.html',
  styleUrls: ['./cost-type-form.component.css']
})
export class CostTypeFormComponent implements OnInit, AfterViewInit {

  public form: FormGroup;

  cost_type:CostType;

  constructor(public dialogRef: MatDialogRef<CostTypeFormComponent>, public tokenService: AuthorizationService,
    @Inject(MAT_DIALOG_DATA) public data: any, private formBuilder: FormBuilder, private ctService: CostTypeService) { }

  ngAfterViewInit(): void {
    if (!this.tokenService.hasRole('writer')) {
      this.form.disable();
    }
    if (this.data.cost_type?.id) {
      this.cost_type = this.data.cost_type;
    }
    else {
      this.cost_type = {
        label: ''
      };
    }
    this.form.patchValue(this.cost_type)
  }


  ngOnInit(): void {
    this.form = this.formBuilder.group({
      id: [''],
      label: ['', Validators.required],
    });
    this.form.controls.id.disable();
  }

  action() {
    this.cost_type = { ...this.cost_type, ...this.form.getRawValue() }
    if (!this.cost_type.id) this.cost_type.id = undefined;
    this.dialogRef.close(this.cost_type)
  }

  abort() {
    this.dialogRef.close(null)
  }
}
