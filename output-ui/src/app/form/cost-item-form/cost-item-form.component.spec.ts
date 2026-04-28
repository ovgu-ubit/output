import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SharedModule } from 'src/app/shared/shared.module';

import { CostItemFormComponent } from './cost-item-form.component';
import { AbstractFormComponent } from '../abstract-form/abstract-form.component';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AuthorizationService } from 'src/app/security/authorization.service';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { PublisherService } from 'src/app/services/entities/publisher.service';
import { CostTypeService } from 'src/app/services/entities/cost-type.service';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { of } from 'rxjs';

describe('CostItemFormComponent', () => {
  let component: CostItemFormComponent;
  let fixture: ComponentFixture<CostItemFormComponent>;

  const mockDialogRef = {
    close: jasmine.createSpy('close')
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
        CostItemFormComponent,
        AbstractFormComponent
      ],
      providers: [
        FormBuilder,
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { entity: {} } },
        { provide: AuthorizationService, useValue: { hasRole: () => true } },
        { provide: ErrorPresentationService, useValue: { clearFieldErrors: () => {}, applyFieldErrors: () => {}, present: () => {} } },
        { provide: PublisherService, useValue: {} },
        { provide: CostTypeService, useValue: { getAll: () => of([]) } },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CostItemFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
