import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NGX_ECHARTS_CONFIG } from 'ngx-echarts';

import { StatisticsComponent } from './statistics.component';
import { SharedModule } from 'src/app/shared/shared.module';
import { TableModule } from 'src/app/table/table.module';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import { of } from 'rxjs';
import { StatisticsService } from 'src/app/statistics/statistics.service';
import { InstituteService } from 'src/app/services/entities/institute.service';
import { PublisherService } from 'src/app/services/entities/publisher.service';
import { ContractService } from 'src/app/services/entities/contract.service';
import { OACategoryService } from 'src/app/services/entities/oa-category.service';
import { PublicationTypeService } from 'src/app/services/entities/publication-type.service';

describe('StatisticsComponent', () => {
  let component: StatisticsComponent;
  let fixture: ComponentFixture<StatisticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedModule, TableModule, NoopAnimationsModule],
      declarations: [ StatisticsComponent ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideStore({}),
        { provide: StatisticsService, useValue: { countPubByYear: () => of([]), countPubByYearAndOACat: () => of([]), countPubByYearAndPubType: () => of([]) } },
        { provide: InstituteService, useValue: { getAll: () => of([]) } },
        { provide: PublisherService, useValue: { getAll: () => of([]) } },
        { provide: ContractService, useValue: { getAll: () => of([]) } },
        { provide: OACategoryService, useValue: { getAll: () => of([]) } },
        { provide: PublicationTypeService, useValue: { getAll: () => of([]) } },
        { provide: NGX_ECHARTS_CONFIG, useValue: { echarts: {} } }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StatisticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
