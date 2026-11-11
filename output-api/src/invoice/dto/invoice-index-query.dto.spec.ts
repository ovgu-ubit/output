import { ValidationPipe } from '@nestjs/common';
import { createValidationException } from '../../common/validation-exception.factory';
import { InvoiceIndexQueryDto } from './invoice-index-query.dto';

describe('InvoiceIndexQueryDto', () => {
    const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true, exceptionFactory: createValidationException });
    const parse = (query: Record<string, unknown>) => pipe.transform(query, { type: 'query', metatype: InvoiceIndexQueryDto });

    it('supplies defaults and transforms false without treating it as true', async () => {
        await expect(parse({ contract_id: '17', invoice_date_missing: 'false' })).resolves.toMatchObject({
            page: 0, page_size: 50, sort: 'date', sort_dir: 'desc', contract_id: 17, invoice_date_missing: false,
        });
    });

    it.each([
        { page: '-1' }, { page_size: '201' }, { page_size: '0' }, { invoice_year: '2026.5' },
        { publication_id: '1 OR 1=1' }, { contract_id: '2147483648' }, { invoice_kind: 'paid' },
        { date_from: '2026-02-30' }, { date_from: '2026-01-01T00:00:00Z' },
        { invoice_date_missing: 'yes' }, { sort: 'constructor' }, { sort_dir: 'DESC; DROP TABLE invoice' },
        { arbitrary: 'column' }, { context: 'missing' }, { q: 'x'.repeat(201) },
    ])('rejects invalid query %j', async query => {
        await expect(parse(query)).rejects.toMatchObject({ status: 400 });
    });
});
