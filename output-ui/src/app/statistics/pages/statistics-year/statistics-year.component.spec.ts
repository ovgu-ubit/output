import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { StatisticsService } from '../../statistics.service';
import { StatisticsYearComponent } from './statistics-year.component';

describe('StatisticsYearComponent', () => {
  let component: StatisticsYearComponent;
  let statService: jasmine.SpyObj<StatisticsService>;

  beforeEach(() => {
    statService = jasmine.createSpyObj<StatisticsService>('StatisticsService', [
      'corresponding',
      'locked',
      'institute',
      'oaCat',
      'publisher',
      'pub_type',
      'contract'
    ]);

    statService.corresponding.and.returnValue(of([{ corresponding: true, value: 1000 }]));
    statService.locked.and.returnValue(of([{ locked: true, value: 400 }]));
    statService.institute.and.returnValue(of([]));
    statService.oaCat.and.returnValue(of([]));
    statService.publisher.and.returnValue(of([]));
    statService.pub_type.and.returnValue(of([]));
    statService.contract.and.returnValue(of([]));

    const route = {
      snapshot: {
        paramMap: {
          get: () => '2025'
        }
      }
    } as unknown as ActivatedRoute;
    const snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);

    component = new StatisticsYearComponent(route, statService, snackBar);
    component.year = 2025;
  });

  it('passes cost mode to locked statistics', () => {
    component.loadData(true);

    expect(statService.locked).toHaveBeenCalledWith(2025, true, component.filter);
  });

  it('shows euro values in boolean chart tooltips during cost mode', () => {
    component.correspondingData = [{ name: 'Corresponding', value: 1000 }];
    component.lockedData = [{ name: 'Gesperrt', value: 400 }];
    component.costs = true;

    (component as any).refreshChartOptions();

    const correspondingTooltip = ((component.eChartOptions as any).tooltip.formatter({
      name: 'Corresponding',
      value: 1000,
      percent: 100,
      color: '#000000'
    })) as string;
    const lockedTooltip = ((component.eChartOptionsLocked as any).tooltip.formatter({
      name: 'Gesperrt',
      value: 400,
      percent: 100,
      color: '#000000'
    })) as string;

    expect(correspondingTooltip).toContain('1.000 €');
    expect(lockedTooltip).toContain('400 €');
  });
});
