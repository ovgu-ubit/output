import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DoiFormComponent } from './doi-form.component';

describe('DoiFormComponent', () => {
  let component: DoiFormComponent;
  let fixture: ComponentFixture<DoiFormComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DoiFormComponent]
    });
    fixture = TestBed.createComponent(DoiFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
