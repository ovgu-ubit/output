import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublishersComponent } from './publishers.component';

describe('PublishersComponent', () => {
  let component: PublishersComponent;
  let fixture: ComponentFixture<PublishersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PublishersComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PublishersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
