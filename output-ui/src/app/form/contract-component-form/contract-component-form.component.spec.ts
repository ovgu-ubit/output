import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ContractComponentFormComponent } from './contract-component-form.component';

describe('ContractComponentFormComponent', () => {
  let component: ContractComponentFormComponent;
  let fixture: ComponentFixture<ContractComponentFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ContractComponentFormComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { entity: {} } },
        { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContractComponentFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
