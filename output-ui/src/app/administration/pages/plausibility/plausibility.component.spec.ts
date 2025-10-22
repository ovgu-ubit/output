import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlausibilityComponent } from './plausibility.component';

describe('PlausibilityComponent', () => {
  let component: PlausibilityComponent;
  let fixture: ComponentFixture<PlausibilityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PlausibilityComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlausibilityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
