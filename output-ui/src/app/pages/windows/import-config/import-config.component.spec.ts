import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImportConfigComponent } from './import-config.component';

describe('ImportConfigComponent', () => {
  let component: ImportConfigComponent;
  let fixture: ComponentFixture<ImportConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ImportConfigComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImportConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
