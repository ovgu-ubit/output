import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnrichComponent } from './enrich.component';

describe('EnrichComponent', () => {
  let component: EnrichComponent;
  let fixture: ComponentFixture<EnrichComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EnrichComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EnrichComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
