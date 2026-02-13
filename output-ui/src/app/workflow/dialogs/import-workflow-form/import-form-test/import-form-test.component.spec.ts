import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportFormTestComponent } from './import-form-test.component';

describe('ImportFormTestComponent', () => {
  let component: ImportFormTestComponent;
  let fixture: ComponentFixture<ImportFormTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportFormTestComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportFormTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
