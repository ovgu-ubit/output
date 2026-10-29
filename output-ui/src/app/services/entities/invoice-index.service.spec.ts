import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { InvoiceIndexService } from './invoice-index.service';
import { RuntimeConfigService } from '../runtime-config.service';

describe('InvoiceIndexService', () => {
    let service: InvoiceIndexService;
    let http: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [
                provideHttpClient(withXhr()), provideHttpClientTesting(), InvoiceIndexService,
                { provide: RuntimeConfigService, useValue: { getValue: () => 'http://localhost/api/' } },
            ] });
        service = TestBed.inject(InvoiceIndexService);
        http = TestBed.inject(HttpTestingController);
    });
    afterEach(() => http.verify());

    it('sends credentials, zero page, false filters and escaped text to the paged endpoint', () => {
        service.index({ page: 0, page_size: 25, cost_center_id: 3, invoice_date_missing: false, q: 'A&B + test' }).subscribe(page => {
            expect(page.total).toBe(10);
        });
        const request = http.expectOne(req => req.url === 'http://localhost/api/invoice/index');
        expect(request.request.method).toBe('GET');
        expect(request.request.withCredentials).toBe(true);
        expect(request.request.params.get('page')).toBe('0');
        expect(request.request.params.get('invoice_date_missing')).toBe('false');
        expect(request.request.params.get('cost_center_id')).toBe('3');
        expect(request.request.params.get('q')).toBe('A&B + test');
        request.flush({ items: [], total: 10, page: 0, page_size: 25 });
    });
});
