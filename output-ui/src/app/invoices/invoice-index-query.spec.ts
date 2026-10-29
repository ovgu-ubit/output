import { convertToParamMap, DefaultUrlSerializer } from '@angular/router';
import { invoiceIndexQueryParams, parseInvoiceIndexQuery } from './invoice-index-query';

describe('Invoice index URLs', () => {
    it('round-trips filters, paging, sorting, zero and false independently of publication state', () => {
        const query = parseInvoiceIndexQuery(convertToParamMap({
            contract_id: '7', cost_center_id: '3', invoice_year: '2026', booking_year: '2025', publication_year: '2024',
            invoice_kind: 'pre_invoice', invoice_date_missing: 'false', context: 'both',
            date_from: '2026-01-01', date_to: '2026-12-31', page: '0', page_size: '25', sort: 'booking_amount', sort_dir: 'asc', q: 'A&B',
        }));
        expect(query.invoice_date_missing).toBe(false);
        expect(query.page).toBe(0);
        const serializer = new DefaultUrlSerializer();
        const url = serializer.parse('/invoices');
        url.queryParams = invoiceIndexQueryParams(query);
        const restored = parseInvoiceIndexQuery(serializer.parse(serializer.serialize(url)).queryParamMap);
        expect(restored).toEqual(query);
    });

    it('ignores malformed or unknown link values and retains safe defaults', () => {
        const query = parseInvoiceIndexQuery(convertToParamMap({
            page: '-1', page_size: '999999', contract_id: 'a', cost_type_id: '2.5', invoice_year: '0',
            date_from: '2026-02-30', invoice_date_missing: 'yes', sort: 'constructor', sort_dir: 'bad', invoice_kind: 'paid',
        }));
        expect(query).toEqual({ page: 0, page_size: 50, sort: 'date', sort_dir: 'desc' });
    });
});
