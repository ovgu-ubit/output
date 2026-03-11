import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { GreaterEntityService } from '../../services/entities/greater-entity.service';
import { OACategoryService } from '../../services/entities/oa-category.service';
import { PublicationTypeService } from '../../services/entities/publication-type.service';
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
        { provide: MatDialog, useValue: { open: jasmine.createSpy('open') } },
        { provide: OACategoryService, useValue: { getAll: () => of([]) } },
        { provide: PublicationTypeService, useValue: { getAll: () => of([]) } },
        { provide: GreaterEntityService, useValue: { getAll: () => of([]) } },
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
