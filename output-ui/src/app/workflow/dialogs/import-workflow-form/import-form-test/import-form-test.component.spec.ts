import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImportFormTestComponent } from './import-form-test.component';
import { ImportFormFacade } from '../import-form-facade.service';
import { of } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('ImportFormTestComponent', () => {
  let component: ImportFormTestComponent;
  let fixture: ComponentFixture<ImportFormTestComponent>;

  const mockFacade = {
    import$: of({}),
    destroy$: of(null)
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportFormTestComponent, NoopAnimationsModule],
      providers: [
        { provide: ImportFormFacade, useValue: mockFacade },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportFormTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
