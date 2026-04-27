import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ImportFormActionComponent } from './import-form-action.component';
import { ImportFormFacade } from '../import-form-facade.service';
import { of } from 'rxjs';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('ImportFormActionComponent', () => {
  let component: ImportFormActionComponent;
  let fixture: ComponentFixture<ImportFormActionComponent>;

  const mockFacade = {
    import$: of({}),
    destroy$: of(null)
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportFormActionComponent, NoopAnimationsModule],
      providers: [
        { provide: ImportFormFacade, useValue: mockFacade },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportFormActionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
