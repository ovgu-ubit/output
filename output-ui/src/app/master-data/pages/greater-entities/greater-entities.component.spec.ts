import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GreaterEntitiesComponent } from './greater-entities.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { TableModule } from 'src/app/table/table.module';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';

describe('GreaterEntitiesComponent', () => {
  let component: GreaterEntitiesComponent;
  let fixture: ComponentFixture<GreaterEntitiesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedModule, TableModule, NoopAnimationsModule],
      declarations: [ GreaterEntitiesComponent ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideStore({})
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GreaterEntitiesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
