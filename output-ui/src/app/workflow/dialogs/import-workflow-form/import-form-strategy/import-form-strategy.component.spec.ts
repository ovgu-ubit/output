import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { Strategy } from '../../../../../../../output-interfaces/Workflow';
import { ImportFormFacade } from '../import-form-facade.service';

import { ImportFormStrategyComponent } from './import-form-strategy.component';

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
      imports: [ImportFormStrategyComponent],
      providers: [
        { provide: ImportFormFacade, useValue: facadeStub },
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
    component.selectionForm.controls.strategy.setValue(Strategy.URL_LOOKUP_AND_RETRIEVE);

    expect(component.selectedStrategyId).toBe('lookup');
    expect(component.strategyForm.contains('url_lookup')).toBeTrue();
    expect(component.strategyForm.contains('url_retrieve')).toBeTrue();
    expect(component.strategyForm.contains('get_lookup_ids')).toBeTrue();
    expect(component.strategyForm.contains('get_retrieve_item')).toBeTrue();
  });
});
