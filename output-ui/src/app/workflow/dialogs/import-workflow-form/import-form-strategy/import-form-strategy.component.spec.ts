import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportFormStrategyComponent } from './import-form-strategy.component';

describe('ImportFormStrategyComponent', () => {
  let component: ImportFormStrategyComponent;
  let fixture: ComponentFixture<ImportFormStrategyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportFormStrategyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportFormStrategyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
