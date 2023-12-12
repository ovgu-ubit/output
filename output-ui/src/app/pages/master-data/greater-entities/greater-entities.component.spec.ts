import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GreaterEntitiesComponent } from './greater-entities.component';

describe('GreaterEntitiesComponent', () => {
  let component: GreaterEntitiesComponent;
  let fixture: ComponentFixture<GreaterEntitiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ GreaterEntitiesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GreaterEntitiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
