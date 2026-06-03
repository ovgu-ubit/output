import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlausibilityComponent } from './plausibility.component';
import { ReportService } from 'src/app/administration/services/report.service';
import { PlausibilityService } from 'src/app/administration/services/plausibility.service';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SharedModule } from 'src/app/shared/shared.module';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { of } from 'rxjs';

describe('PlausibilityComponent', () => {
  let component: PlausibilityComponent;
  let fixture: ComponentFixture<PlausibilityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatSnackBarModule,
        SharedModule
      ],
      declarations: [ PlausibilityComponent ],
      providers: [
        FormBuilder,
        { provide: ReportService, useValue: { getReports: () => of([]) } },
        { provide: PlausibilityService, useValue: { isRunning: () => of([]), getExports: () => of([]), getStatus: () => of([]) } },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideStore({})
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlausibilityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
