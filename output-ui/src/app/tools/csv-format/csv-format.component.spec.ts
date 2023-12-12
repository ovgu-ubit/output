import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CsvFormatComponent } from './csv-format.component';

describe('CsvFormatComponent', () => {
  let component: CsvFormatComponent;
  let fixture: ComponentFixture<CsvFormatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CsvFormatComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CsvFormatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
