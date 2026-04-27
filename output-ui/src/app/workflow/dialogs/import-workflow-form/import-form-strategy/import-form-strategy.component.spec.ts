import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { ImportStrategy } from '../../../../../../../output-interfaces/Workflow';
import { ImportFormFacade } from '../import-form-facade.service';
import { ImportFormStrategyComponent } from './import-form-strategy.component';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ErrorPresentationService } from 'src/app/core/errors/error-presentation.service';

describe('ImportFormStrategyComponent', () => {
  let component: ImportFormStrategyComponent;
  let fixture: ComponentFixture<ImportFormStrategyComponent>;
  const facadeStub = {
    import$: new Subject(),
    destroy$: new Subject<void>(),
    patch: jasmine.createSpy('patch'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportFormStrategyComponent, NoopAnimationsModule],
      providers: [
        { provide: ImportFormFacade, useValue: facadeStub },
        { provide: ErrorPresentationService, useValue: { present: () => {} } },
        provideHttpClient(),
        provideHttpClientTesting()
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportFormStrategyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('builds lookup-and-retrieve strategy forms', () => {
    component.selectionForm.controls.strategy.setValue(ImportStrategy.URL_LOOKUP_AND_RETRIEVE);

    expect(component.selectedStrategyId).toBe('lookup');
    expect(component.strategyForm.contains('url_lookup')).toBeTrue();
    expect(component.strategyForm.contains('url_retrieve')).toBeTrue();
    expect(component.strategyForm.contains('get_lookup_ids')).toBeTrue();
    expect(component.strategyForm.contains('get_retrieve_item')).toBeTrue();
  });
});
