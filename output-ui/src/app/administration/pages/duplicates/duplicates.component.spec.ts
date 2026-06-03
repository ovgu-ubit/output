import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DuplicatesComponent } from './duplicates.component';
import { PublicationDuplicateService } from 'src/app/services/entities/duplicate.service';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { SharedModule } from 'src/app/shared/shared.module';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { TableModule } from 'src/app/table/table.module';
import { of } from 'rxjs';

describe('DuplicatesComponent', () => {
  let component: DuplicatesComponent;
  let fixture: ComponentFixture<DuplicatesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        MatSnackBarModule,
        SharedModule,
        TableModule
      ],
      declarations: [ DuplicatesComponent ],
      providers: [
        { provide: PublicationDuplicateService, useValue: { getAll: () => of([]), updateData: () => of([]) } },
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideStore({})
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DuplicatesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
