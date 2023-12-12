import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InstituteFormComponent } from './institute-form.component';

describe('InstituteFormComponent', () => {
  let component: InstituteFormComponent;
  let fixture: ComponentFixture<InstituteFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ InstituteFormComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InstituteFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
