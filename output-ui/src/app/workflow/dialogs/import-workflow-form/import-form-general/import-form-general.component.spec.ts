import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportFormGeneralComponent } from './import-form-general.component';

describe('ImportFormGeneralComponent', () => {
  let component: ImportFormGeneralComponent;
  let fixture: ComponentFixture<ImportFormGeneralComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportFormGeneralComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportFormGeneralComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
