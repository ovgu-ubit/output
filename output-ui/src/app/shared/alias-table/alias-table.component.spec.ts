import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AliasTableComponent } from './alias-table.component';

describe('AliasTableComponent', () => {
  let component: AliasTableComponent<any>;
  let fixture: ComponentFixture<AliasTableComponent<any>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AliasTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AliasTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
