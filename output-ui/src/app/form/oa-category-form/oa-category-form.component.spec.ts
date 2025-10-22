import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OaCategoryFormComponent } from './oa-category-form.component';

describe('OaCategoryFormComponent', () => {
  let component: OaCategoryFormComponent;
  let fixture: ComponentFixture<OaCategoryFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OaCategoryFormComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OaCategoryFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
