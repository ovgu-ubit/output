import { DataSource, getMetadataArgsStorage, SelectQueryBuilder } from 'typeorm';
import { InvoiceKind } from '@output/interfaces';
import { Invoice } from './Invoice.entity';
import { InvoiceIndexQueryDto } from './dto/invoice-index-query.dto';
import { InvoiceIndexService } from './invoice-index.service';

// Real PostgreSQL query generation, without opening a database connection.
class MetadataDataSource extends DataSource {
    async prepare(): Promise<void> { await this.buildMetadatas(); }
}

describe('InvoiceIndexService', () => {
    let dataSource: MetadataDataSource;
    let service: InvoiceIndexService;
    let listQuery: SelectQueryBuilder<Invoice>;
    let generatedSql: string;
    let countSql: string;
    let rows: Record<string, unknown>[];

    beforeAll(async () => {
        dataSource = new MetadataDataSource({ type: 'postgres', entities: getMetadataArgsStorage().tables.map(table => table.target as Function) });
        await dataSource.prepare();
    });

    beforeEach(() => {
        rows = [];
        const repository = dataSource.getRepository(Invoice);
        jest.spyOn(repository, 'createQueryBuilder').mockImplementation(alias => {
            listQuery = dataSource.createQueryBuilder(Invoice, alias!);
            const originalClone = listQuery.clone.bind(listQuery);
            jest.spyOn(listQuery, 'clone').mockImplementation(() => {
                const countQuery = originalClone();
                jest.spyOn(countQuery, 'getRawOne').mockImplementation(async () => {
                    countSql = countQuery.getSql();
                    return { total: '3' } as never;
                });
                return countQuery;
            });
            jest.spyOn(listQuery, 'getRawMany').mockImplementation(async () => {
                generatedSql = listQuery.getSql();
                return rows as never;
            });
            return listQuery;
        });
        service = new InvoiceIndexService(repository);
    });

    afterEach(() => jest.restoreAllMocks());

    it('aggregates positions independently of the cost-type filter and pages invoice rows', async () => {
        const result = await service.index(Object.assign(new InvoiceIndexQueryDto(), { cost_type_id: 5, page: 2, page_size: 25 }));
        expect(generatedSql).toContain('GROUP BY cost_item."invoiceId"');
        expect(generatedSql).toContain('EXISTS (SELECT 1 FROM cost_item matching_item');
        expect(generatedSql).toContain('COUNT("cost_item"."euro_value") = COUNT(*)');
        expect(generatedSql).toContain('COUNT("cost_item"."vat") = COUNT(*)');
        expect(generatedSql).toContain('ORDER BY "invoice"."date" DESC NULLS LAST, "invoice"."id" DESC LIMIT 25 OFFSET 50');
        expect(countSql).toContain('COUNT(*) AS "total"');
        expect(countSql).not.toContain('LIMIT');
        expect(result).toMatchObject({ total: 3, page: 2, page_size: 25 });
        expect(listQuery.getParameters()).toMatchObject({ cost_type_id: 5 });
    });

    it('matches both contract paths without hiding unassigned or deleted-publication invoices by default', async () => {
        await service.index(Object.assign(new InvoiceIndexQueryDto(), { contract_id: 7 }));
        expect(generatedSql).toContain('("publication_contract"."id" =');
        expect(generatedSql).toContain('OR "component_contract"."id" =');
        expect(generatedSql).toContain("ELSE 'unassigned' END");
        expect(generatedSql).not.toContain('"publication"."delete_date" IS NULL');
        expect(listQuery.getParameters()).toMatchObject({ contract_id: 7 });
    });

    it('keeps the three year axes and inclusive calendar-date ranges independent', async () => {
        await service.index(Object.assign(new InvoiceIndexQueryDto(), {
            invoice_year: 2026, booking_year: 2025, publication_year: 2024,
            date_from: '2026-01-01', date_to: '2026-12-31',
        }));
        expect(listQuery.getParameters()).toMatchObject({
            invoice_year_start: '2026-01-01T00:00:00.000Z', invoice_year_end: '2027-01-01T00:00:00.000Z',
            booking_year_start: '2025-01-01T00:00:00.000Z', publication_year_start: '2024-01-01T00:00:00.000Z',
            date_from: '2026-01-01T00:00:00.000Z', date_until: '2027-01-01T00:00:00.000Z',
        });
        expect(generatedSql).toContain('"invoice"."date" >=');
        expect(generatedSql).toContain('"invoice"."date" <');
        expect(generatedSql).toContain('"invoice"."date" AT TIME ZONE \'UTC\'');
    });

    it('preserves zero and unknown amounts, converts counts and serializes dates', async () => {
        rows = [{
            id: 1, invoice_kind: InvoiceKind.PRE_INVOICE, context: 'contract_component',
            date: new Date('2026-01-01T00:00:00Z'), booking_date: null, booking_amount: 0,
            net_amount_eur: '0', vat_amount_eur: null, gross_amount_eur: null,
            item_count: '2', missing_amount_item_count: '1', cost_type_ids: [3, 4], cost_type_labels: ['APC', 'BPC'],
        }];
        const result = await service.index(new InvoiceIndexQueryDto());
        expect(result.items[0]).toMatchObject({
            booking_amount: 0, net_amount_eur: 0, vat_amount_eur: null, gross_amount_eur: null,
            date: '2026-01-01T00:00:00.000Z', booking_date: null, item_count: 2, missing_amount_item_count: 1,
        });
    });

    it('filters missing dates, kind, IDs and context using bound parameters', async () => {
        await service.index(Object.assign(new InvoiceIndexQueryDto(), {
            invoice_date_missing: true, invoice_kind: InvoiceKind.PRE_INVOICE, context: 'unassigned',
            publication_id: 9, cost_center_id: 10, contract_component_id: 11, q: "50%_ 'quote'",
        }));
        expect(generatedSql).toContain('"invoice"."date" IS NULL');
        expect(generatedSql).not.toContain("'quote'");
        expect(listQuery.getParameters()).toMatchObject({
            publication_id: 9, cost_center_id: 10, contract_component_id: 11,
            context: 'unassigned', kind: 'pre_invoice', search: "%50\\%\\_ 'quote'%",
        });
    });

    it('rejects reversed date bounds', async () => {
        await expect(service.index(Object.assign(new InvoiceIndexQueryDto(), {
            booking_date_from: '2026-12-31', booking_date_to: '2026-01-01',
        }))).rejects.toMatchObject({ status: 400 });
    });
});
