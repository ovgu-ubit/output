import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';
import { SharedModule } from 'src/app/shared/shared.module';
import { ValidationFormFacade } from '../validation-form-facade.service';
import { ValidationFormRulesComponent } from './validation-form-rules.component';
import { CompareOperation } from '../../../../../../../output-interfaces/Config';

describe('ValidationFormRulesComponent', () => {
  let component: ValidationFormRulesComponent;
  let fixture: ComponentFixture<ValidationFormRulesComponent>;

  const mockFacade = {
    validation$: of({ rules: [] }),
    destroy$: of(),
    patch: jasmine.createSpy('patch'),
    save: jasmine.createSpy('save').and.returnValue(of({}))
  };

  const mockErrorPresentation = {
    applyFieldErrors: jasmine.createSpy('applyFieldErrors'),
    present: jasmine.createSpy('present')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        ValidationFormRulesComponent,
        NoopAnimationsModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatSnackBarModule,
        SharedModule
      ],
      providers: [
        FormBuilder,
        { provide: ValidationFormFacade, useValue: mockFacade },
        { provide: ErrorPresentationService, useValue: mockErrorPresentation }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ValidationFormRulesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should correctly normalize boolean values to true/false', () => {
    const group = component['formBuilder'].group({
      path: ['locked'], // Assuming 'locked' is boolean
      comp: [CompareOperation.EQUALS],
      value: ['true']
    });

    component.normalizeCompareOperator(group);
    expect(group.get('value')?.value).toBe(true as any);

    group.get('value')?.setValue('false');
    component.normalizeCompareOperator(group);
    expect(group.get('value')?.value).toBe(false as any);

    group.get('value')?.setValue('some-invalid-value');
    component.normalizeCompareOperator(group);
    expect(group.get('value')?.value).toBe(false as any);
  });
});
