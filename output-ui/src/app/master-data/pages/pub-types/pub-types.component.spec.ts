import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PubTypesComponent } from './pub-types.component';

describe('PubTypesComponent', () => {
  let component: PubTypesComponent;
  let fixture: ComponentFixture<PubTypesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PubTypesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PubTypesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
