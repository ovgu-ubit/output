import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import {  GROUP, STATISTIC, TIMEFRAME  } from '@output/interfaces';
import { RuntimeConfigService } from '../services/runtime-config.service';
import { StatisticsService } from './statistics.service';

describe('StatisticsService', () => {
  it('requests locked yearly statistics as net costs when cost mode is enabled', () => {
    const post = jasmine.createSpy().and.returnValue(of([{ locked: true, value: 12 }]));
    const http = { post } as Pick<HttpClient, 'post'> as HttpClient;
    const runtimeConfigService = {
      getValue: jasmine.createSpy().and.returnValue('http://api/')
    } as unknown as RuntimeConfigService;
    const service = new StatisticsService(http, runtimeConfigService);

    service.locked(2025, true, { locked: true }).subscribe();

    expect(post).toHaveBeenCalledWith('http://api/statistics/publication_statistic', {
      year: 2025,
      statistic: STATISTIC.NET_COSTS,
      group: [GROUP.LOCK],
      timeframe: TIMEFRAME.CURRENT_YEAR,
      filterOptions: { locked: true }
    });
  });

  it('requests cost-center yearly statistics with the cost-center group', () => {
    const post = jasmine.createSpy().and.returnValue(of([{ cost_center: 'Test', cost_center_id: 3, value: 12 }]));
    const http = { post } as Pick<HttpClient, 'post'> as HttpClient;
    const runtimeConfigService = {
      getValue: jasmine.createSpy().and.returnValue('http://api/')
    } as unknown as RuntimeConfigService;
    const service = new StatisticsService(http, runtimeConfigService);

    service.costCenter(2025, false, { costCenterId: [3] }).subscribe();

    expect(post).toHaveBeenCalledWith('http://api/statistics/publication_statistic', {
      year: 2025,
      statistic: STATISTIC.COUNT,
      group: [GROUP.COST_CENTER],
      timeframe: TIMEFRAME.CURRENT_YEAR,
      filterOptions: { costCenterId: [3] }
    });
  });
});
