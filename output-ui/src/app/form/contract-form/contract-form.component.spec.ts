import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { ContractFormComponent } from './contract-form.component';
import { ContractService } from 'src/app/services/entities/contract.service';

describe('ContractFormComponent', () => {
  let component: ContractFormComponent;
  let fixture: ComponentFixture<ContractFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ContractFormComponent],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { entity: {} } },
        { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
        { provide: ContractService, useValue: {} },
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(null) }) } },
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContractFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
