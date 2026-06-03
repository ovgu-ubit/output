import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { PublisherService } from 'src/app/services/entities/publisher.service';
import { CostTypeService } from 'src/app/services/entities/cost-type.service';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SharedModule } from 'src/app/shared/shared.module';

import { DoiFormComponent } from './doi-form.component';
import { AbstractFormComponent } from '../abstract-form/abstract-form.component';

describe('DoiFormComponent', () => {
  let component: DoiFormComponent;
  let fixture: ComponentFixture<DoiFormComponent>;

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
        DoiFormComponent,
        AbstractFormComponent
      ],
      providers: [
        FormBuilder,
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { entity: {} } },
        { provide: AuthorizationService, useValue: mockAuthService },
        { provide: ErrorPresentationService, useValue: mockErrorService },
        { provide: PublisherService, useValue: {} },
        { provide: CostTypeService, useValue: {} },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DoiFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
