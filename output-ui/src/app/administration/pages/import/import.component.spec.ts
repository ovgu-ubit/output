import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { of } from 'rxjs';
import { ImportService } from 'src/app/administration/services/import.service';
import { ReportService } from 'src/app/administration/services/report.service';
import { SharedModule } from 'src/app/shared/shared.module';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ImportComponent } from './import.component';

describe('ImportComponent', () => {
  let component: ImportComponent;
  let fixture: ComponentFixture<ImportComponent>;

  const mockImportService = {
    isRunning: jasmine.createSpy('isRunning').and.returnValue(of([])),
    getImports: jasmine.createSpy('getImports').and.returnValue(of([])),
    getStatus: jasmine.createSpy('getStatus').and.returnValue(of([]))
  };

  const mockReportService = {
    getReports: jasmine.createSpy('getReports').and.returnValue(of([]))
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatSnackBarModule,
        SharedModule,
        RouterTestingModule
      ],
      declarations: [ ImportComponent ],
      providers: [
        { provide: ImportService, useValue: mockImportService },
        { provide: ReportService, useValue: mockReportService },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
