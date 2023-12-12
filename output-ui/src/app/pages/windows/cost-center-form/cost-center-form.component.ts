import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { CostCenterService } from 'src/app/services/entities/cost-center.service';
import { CostCenter } from '../../../../../../output-interfaces/Publication';

@Component({
  selector: 'app-cost-center-form',
  templateUrl: './cost-center-form.component.html',
  styleUrls: ['./cost-center-form.component.css']
})
export class CostCenterFormComponent implements OnInit, AfterViewInit {

  public form: FormGroup;

  cost_center:CostCenter;

  constructor(public dialogRef: MatDialogRef<CostCenterFormComponent>, public tokenService: AuthorizationService,
    @Inject(MAT_DIALOG_DATA) public data: any, private formBuilder: FormBuilder, private ccService: CostCenterService) { }

  ngAfterViewInit(): void {
    if (!this.tokenService.hasRole('writer')) {
      this.form.disable();
    }
    if (this.data.cost_center?.id) {
      this.cost_center = this.data.cost_center;
    }
    else {
      this.cost_center = {
        number: '',
        label: ''
      };
    }
    this.form.patchValue(this.cost_center)
  }


  ngOnInit(): void {
    this.form = this.formBuilder.group({
      id: [''],
      label: ['', Validators.required],
      number: ['', Validators.required],
    });
    this.form.controls.id.disable();
  }

  action() {
    this.cost_center = { ...this.cost_center, ...this.form.getRawValue() }
    if (!this.cost_center.id) this.cost_center.id = undefined;
    this.dialogRef.close(this.cost_center)
  }

  abort() {
    this.dialogRef.close(null)
  }
}
