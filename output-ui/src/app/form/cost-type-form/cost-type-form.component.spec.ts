import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CostTypeFormComponent } from './cost-type-form.component';

describe('CostTypeFormComponent', () => {
  let component: CostTypeFormComponent;
  let fixture: ComponentFixture<CostTypeFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CostTypeFormComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CostTypeFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
