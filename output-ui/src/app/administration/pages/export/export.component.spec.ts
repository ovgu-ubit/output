import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExportComponent } from './export.component';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { SharedModule } from 'src/app/shared/shared.module';
import { ExportService } from 'src/app/administration/services/export.service';
import { ReportService } from 'src/app/administration/services/report.service';
import { viewConfigReducer } from 'src/app/services/redux';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { of } from 'rxjs';

describe('ExportComponent', () => {
  let component: ExportComponent;
  let fixture: ComponentFixture<ExportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        MatDialogModule,
        MatSnackBarModule,
        SharedModule
      ],
      declarations: [ ExportComponent ],
      providers: [
        { provide: ExportService, useValue: { getExports: () => of([]), getStatus: () => Promise.resolve([]) } },
        { provide: ReportService, useValue: { getReports: () => of([]) } },
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        provideRouter([]),
        provideStore({ viewConfigReducer })
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
