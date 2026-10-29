import type { MockedObject } from "vitest";
import { ActivatedRoute } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of } from 'rxjs';
import { StatisticsService } from '../../statistics.service';
import { StatisticsYearComponent } from './statistics-year.component';

describe('StatisticsYearComponent', () => {
    let component: StatisticsYearComponent;
    let statService: MockedObject<Pick<StatisticsService, 'corresponding' | 'locked' | 'institute' | 'oaCat' | 'publisher' | 'pub_type' | 'contract' | 'costCenter'>>;

    beforeEach(() => {
        statService = {
            corresponding: vi.fn().mockName("StatisticsService.corresponding"),
            locked: vi.fn().mockName("StatisticsService.locked"),
            institute: vi.fn().mockName("StatisticsService.institute"),
            oaCat: vi.fn().mockName("StatisticsService.oaCat"),
            publisher: vi.fn().mockName("StatisticsService.publisher"),
            pub_type: vi.fn().mockName("StatisticsService.pub_type"),
            contract: vi.fn().mockName("StatisticsService.contract"),
            costCenter: vi.fn().mockName("StatisticsService.costCenter")
        };

        statService.corresponding.mockReturnValue(of([{ corresponding: true, value: 1000 }]));
        statService.locked.mockReturnValue(of([{ locked: true, value: 400 }]));
        statService.institute.mockReturnValue(of([]));
        statService.oaCat.mockReturnValue(of([]));
        statService.publisher.mockReturnValue(of([]));
        statService.pub_type.mockReturnValue(of([]));
        statService.contract.mockReturnValue(of([]));
        statService.costCenter.mockReturnValue(of([]));

        const route = {
            snapshot: {
                paramMap: {
                    get: () => '2025'
                }
            }
        } as unknown as ActivatedRoute;
        const snackBar = {
            open: vi.fn().mockName("MatSnackBar.open")
        };

        component = new StatisticsYearComponent(route, statService as unknown as StatisticsService, snackBar as unknown as MatSnackBar);
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
