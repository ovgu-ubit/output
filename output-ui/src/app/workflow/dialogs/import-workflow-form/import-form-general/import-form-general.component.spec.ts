import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImportFormGeneralComponent } from './import-form-general.component';
import { ImportFormFacade } from '../import-form-facade.service';
import { of } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';

describe('ImportFormGeneralComponent', () => {
  let component: ImportFormGeneralComponent;
  let fixture: ComponentFixture<ImportFormGeneralComponent>;

  const mockFacade = {
    import$: of({}),
    destroy$: of(null)
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportFormGeneralComponent, NoopAnimationsModule, ReactiveFormsModule],
      providers: [
        { provide: ImportFormFacade, useValue: mockFacade },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportFormGeneralComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
