import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OaCategoriesComponent } from './oa-categories.component';

describe('OaCategoriesComponent', () => {
  let component: OaCategoriesComponent;
  let fixture: ComponentFixture<OaCategoriesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OaCategoriesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OaCategoriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
