import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportFormActionComponent } from './import-form-action.component';

describe('ImportFormActionComponent', () => {
  let component: ImportFormActionComponent;
  let fixture: ComponentFixture<ImportFormActionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImportFormActionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportFormActionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
