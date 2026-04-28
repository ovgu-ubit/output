import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { OACategoryService } from 'src/app/services/entities/oa-category.service';
import { PublicationTypeService } from 'src/app/services/entities/publication-type.service';
import { GreaterEntityService } from 'src/app/services/entities/greater-entity.service';
import { PublisherService } from 'src/app/services/entities/publisher.service';
import { CostTypeService } from 'src/app/services/entities/cost-type.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SharedModule } from 'src/app/shared/shared.module';

import { ContractComponentFormComponent } from './contract-component-form.component';
import { AbstractFormComponent } from '../abstract-form/abstract-form.component';

describe('ContractComponentFormComponent', () => {
  let component: ContractComponentFormComponent;
  let fixture: ComponentFixture<ContractComponentFormComponent>;

  const mockDialogRef = {
    close: jasmine.createSpy('close')
  };

  const mockAuthService = {
    hasRole: jasmine.createSpy('hasRole').and.returnValue(true)
  };

  const mockErrorService = {
    clearFieldErrors: jasmine.createSpy('clearFieldErrors'),
    applyFieldErrors: jasmine.createSpy('applyFieldErrors'),
    present: jasmine.createSpy('present')
  };

  const mockOaService = {
    getAll: jasmine.createSpy('getAll').and.returnValue(of([]))
  };

  const mockPubTypeService = {
    getAll: jasmine.createSpy('getAll').and.returnValue(of([]))
  };

  const mockGreaterEntityService = {
    getAll: jasmine.createSpy('getAll').and.returnValue(of([]))
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatSnackBarModule,
        SharedModule
      ],
      declarations: [ 
        ContractComponentFormComponent,
        AbstractFormComponent
      ],
      providers: [
        FormBuilder,
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { entity: {} } },
        { provide: AuthorizationService, useValue: mockAuthService },
        { provide: ErrorPresentationService, useValue: mockErrorService },
        { provide: OACategoryService, useValue: mockOaService },
        { provide: PublicationTypeService, useValue: mockPubTypeService },
        { provide: GreaterEntityService, useValue: mockGreaterEntityService },
        { provide: PublisherService, useValue: {} },
        { provide: CostTypeService, useValue: {} },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContractComponentFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return booking_amount even when it is zero', () => {
    expect(component.getInvoiceCosts({ booking_amount: 0 } as any)).toBe(0);
  });
});
