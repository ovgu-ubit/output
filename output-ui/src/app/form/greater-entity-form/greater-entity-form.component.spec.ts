import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GreaterEntityFormComponent } from './greater-entity-form.component';

describe('GreaterEntityFormComponent', () => {
  let component: GreaterEntityFormComponent;
  let fixture: ComponentFixture<GreaterEntityFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GreaterEntityFormComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GreaterEntityFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
