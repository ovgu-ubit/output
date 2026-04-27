import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CostTypesComponent } from './cost-types.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { TableModule } from 'src/app/table/table.module';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';

describe('CostTypesComponent', () => {
  let component: CostTypesComponent;
  let fixture: ComponentFixture<CostTypesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedModule, TableModule, NoopAnimationsModule],
      declarations: [ CostTypesComponent ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideStore({})
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CostTypesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
