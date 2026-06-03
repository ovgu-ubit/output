import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EnrichComponent } from './enrich.component';
import { ReportService } from 'src/app/administration/services/report.service';
import { EnrichService } from 'src/app/administration/services/enrich.service';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SharedModule } from 'src/app/shared/shared.module';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';

describe('EnrichComponent', () => {
  let component: EnrichComponent;
  let fixture: ComponentFixture<EnrichComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatSnackBarModule,
        SharedModule
      ],
      declarations: [ EnrichComponent ],
      providers: [
        FormBuilder,
        { provide: ReportService, useValue: { getReports: () => of([]) } },
        { provide: EnrichService, useValue: { isRunning: () => of([]), getEnrichs: () => of([]), getStatus: () => of([]) } },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideStore({})
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EnrichComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
