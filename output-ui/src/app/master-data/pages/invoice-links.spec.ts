import type { Mock, MockedObject } from "vitest";
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Type } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { delay, of } from 'rxjs';
import { ConfigService } from '../../administration/services/config.service';
import { ErrorPresentationService } from '../../core/errors/error-presentation.service';
import { AuthorizationService } from '../../security/authorization.service';
import { CookieTokenService } from '../../security/cookie.token.service';
import { ContractService } from '../../services/entities/contract.service';
import { CostCenterService } from '../../services/entities/cost-center.service';
import { CostTypeService } from '../../services/entities/cost-type.service';
import { SharedModule } from '../../shared/shared.module';
import { TableModule } from '../../table/table.module';
import { ContractsComponent } from './contracts/contracts.component';
import { CostCenterComponent } from './cost-center/cost-center.component';
import { CostTypesComponent } from './cost-types/cost-types.component';

describe('Invoice links in master-data tables', () => {
    let role: string;
    let reportingYear: number | null;
    let rows: any[];
    let errors: MockedObject<Pick<ErrorPresentationService, 'present'>>;
    let store: {
        select: Mock;
        dispatch: Mock;
    };

    beforeEach(async () => {
        role = 'reader';
        reportingYear = 2026;
        rows = [{ id: 42, label: 'Test', pub_count: 1, pub_count_total: 1, invoice_count: 2, invoice_count_total: 12 }];
        errors = {
            present: vi.fn().mockName("ErrorPresentationService.present")
        };
        store = { select: vi.fn().mockName('select').mockImplementation(() => of(reportingYear)), dispatch: vi.fn().mockName('dispatch') };
        const index = () => of(rows).pipe(delay(0));
        const authorization = new CookieTokenService({
            check: () => role !== 'anonymous',
            get: () => JSON.stringify({ id: 'test', permissions: [{ appname: 'output', rolename: role }] }),
        } as never, null!, { getValue: () => true } as never, null!, null!, null!);
        await TestBed.configureTestingModule({
            imports: [SharedModule, TableModule, NoopAnimationsModule],
            declarations: [ContractsComponent, CostCenterComponent, CostTypesComponent],
            providers: [
                provideRouter([]),
                { provide: Store, useValue: store },
                { provide: ConfigService, useValue: { get: () => of({ value: 2026 }) } },
                { provide: AuthorizationService, useValue: authorization },
                { provide: ErrorPresentationService, useValue: errors },
                { provide: ContractService, useValue: { index } },
                { provide: CostCenterService, useValue: { index } },
                { provide: CostTypeService, useValue: { index } },
            ],
        }).compileComponents();
    });

    async function render(component: Type<unknown>): Promise<ComponentFixture<unknown>> {
        const fixture = TestBed.createComponent(component);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
        expect(errors.present).not.toHaveBeenCalled();
        return fixture;
    }

    const pages = [
        { component: ContractsComponent, filter: 'contract_id' },
        { component: CostCenterComponent, filter: 'cost_center_id' },
        { component: CostTypesComponent, filter: 'cost_type_id' },
    ];

    for (const { component, filter } of pages) {
        it(`renders yearly and all-years invoice counts and links for ${filter}`, async () => {
            const fixture = await render(component);
            const table: HTMLElement = fixture.nativeElement;
            const yearly = table.querySelector<HTMLAnchorElement>('td.mat-column-invoice_count a')!;
            const total = table.querySelector<HTMLAnchorElement>('td.mat-column-invoice_count_total a')!;
            const router = TestBed.inject(Router);
            expect(router.parseUrl(yearly.getAttribute('href')!).queryParams).toEqual({ [filter]: '42', invoice_year: '2026' });
            expect(router.parseUrl(total.getAttribute('href')!).queryParams).toEqual({ [filter]: '42' });
            expect(table.querySelector('th.mat-column-invoice_count')!.textContent).toContain('2026');
            expect(table.querySelector('td.mat-column-invoice_count')!.textContent).toContain('2');
            expect(table.querySelector('td.mat-column-invoice_count_total')!.textContent).toContain('12');
            expect(store.dispatch).not.toHaveBeenCalled();
        });

        it(`links undated ${filter} invoices without leaking the year into totals`, async () => {
            reportingYear = null;
            const fixture = await render(component);
            const table: HTMLElement = fixture.nativeElement;
            const yearly = table.querySelector<HTMLAnchorElement>('td.mat-column-invoice_count a')!;
            const total = table.querySelector<HTMLAnchorElement>('td.mat-column-invoice_count_total a')!;
            expect(yearly.getAttribute('href')).toContain('invoice_date_missing=true');
            expect(total.getAttribute('href')).not.toContain('invoice_date_missing');
            expect(table.querySelector('th.mat-column-invoice_count')!.textContent).toContain('ohne Datum');
        });

        it(`shows zero without an invoice link for ${filter}`, async () => {
            rows[0].invoice_count = 0;
            rows[0].invoice_count_total = 0;
            const fixture = await render(component);
            expect(fixture.nativeElement.querySelector('td.mat-column-invoice_count').textContent.trim()).toBe('0');
            expect(fixture.nativeElement.querySelector('td.mat-column-invoice_count a')).toBeNull();
            expect(fixture.nativeElement.querySelector('td.mat-column-invoice_count_total a')).toBeNull();
        });

        it(`shows ${filter} invoice counts and links to publication writers via their inherited reader role`, async () => {
            role = 'publication_writer';
            const fixture = await render(component);
            expect(fixture.nativeElement.querySelector('td.mat-column-invoice_count a')).not.toBeNull();
            expect(fixture.nativeElement.querySelector('td.mat-column-invoice_count_total a')).not.toBeNull();
        });

        it(`hides ${filter} invoice columns from anonymous users`, async () => {
            role = 'anonymous';
            const fixture = await render(component);
            expect(fixture.nativeElement.querySelector('.mat-column-invoice_count')).toBeNull();
            expect(fixture.nativeElement.querySelector('.mat-column-invoice_count_total')).toBeNull();
        });
    }
});
