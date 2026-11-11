import { DataSource, getMetadataArgsStorage, SelectQueryBuilder } from 'typeorm';
import { Contract } from '../contract/Contract.entity';
import { ContractService } from '../contract/contract.service';
import { CostCenter } from './CostCenter.entity';
import { CostType } from './CostType.entity';
import { CostCenterService } from './cost-center.service';
import { CostTypeService } from './cost-type.service';
import { addInvoiceCounts, normalizeInvoiceCounts } from './invoice-counts';

class MetadataDataSource extends DataSource {
    async prepare(): Promise<void> { await this.buildMetadatas(); }
}

describe('Invoice counts in master-data indexes', () => {
    let source: MetadataDataSource;

    beforeAll(async () => {
        source = new MetadataDataSource({ type: 'postgres', entities: getMetadataArgsStorage().tables.map(table => table.target as Function) });
        await source.prepare();
    });
    afterEach(() => jest.restoreAllMocks());

    const cases = [
        { entity: Contract, alias: 'contract', filter: 'contract_id' as const },
        { entity: CostCenter, alias: 'cost_center', filter: 'cost_center_id' as const },
        { entity: CostType, alias: 'cost_type', filter: 'cost_type_id' as const },
    ];

    function indexService(entity: typeof Contract | typeof CostCenter | typeof CostType) {
        const repository = source.getRepository(entity);
        const config = { get: jest.fn().mockResolvedValue('2026') };
        let query: SelectQueryBuilder<any>;
        jest.spyOn(repository, 'createQueryBuilder').mockImplementation(alias => {
            query = source.createQueryBuilder(entity, alias!);
            jest.spyOn(query, 'getRawMany').mockImplementation(async () => {
                // Force actual PostgreSQL SQL generation without a database connection.
                query.getSql();
                const counts = query.expressionMap.selects.some(select => select.aliasName === 'invoice_count')
                    ? { invoice_count: '2', invoice_count_total: '12' } : {};
                return [{ id: 1, label: 'Entity', pub_count: '1', net_costs: 100, ...counts }] as never;
            });
            return query;
        });
        const service = entity === Contract
            ? new ContractService(repository as never, config as never, null!, null!, null!, null!, null!, source)
            : entity === CostCenter
                ? new CostCenterService(repository as never, config as never)
                : new CostTypeService(repository as never, config as never);
        const index = (year: number, allowed = true) => service instanceof ContractService
            ? service.index(year, true, allowed)
            : service instanceof CostCenterService
                ? service.getCostCenterIndex(year, true, allowed)
                : service.getCostTypeIndex(year, true, allowed);
        return { index, getQuery: () => query };
    }

    it.each(cases)('adds independent yearly and total counts to $alias and normalizes PostgreSQL counts', async ({ entity }) => {
        const { index, getQuery } = indexService(entity);
        expect(await index(2026)).toEqual([{
            id: 1, label: 'Entity', pub_count: '1', net_costs: 100, invoice_count: 2, invoice_count_total: 12,
        }]);
        const query = getQuery();
        const total = query.expressionMap.selects.find(select => select.aliasName === 'invoice_count_total')!.selection;
        const yearly = query.expressionMap.selects.find(select => select.aliasName === 'invoice_count')!.selection;
        expect(total).toContain('COUNT(*)');
        expect(total).not.toContain('counted_invoice.date');
        expect(total).not.toContain('delete_date');
        expect(yearly).toContain('"counted_invoice"."date" >= :invoice_count_start');
        expect(yearly).toContain('"counted_invoice"."date" < :invoice_count_end');
        expect(query.getParameters()).toMatchObject({
            invoice_count_start: '2026-01-01T00:00:00.000Z', invoice_count_end: '2027-01-01T00:00:00.000Z',
        });
        expect(total).not.toContain('invoice_kind'); // Both invoices and pre-invoices count.
    });

    it.each(cases)('omits invoice counts entirely from public $alias responses', async ({ entity }) => {
        const { index, getQuery } = indexService(entity);
        const rows = await index(2026, false);
        expect(rows[0]).not.toHaveProperty('invoice_count');
        expect(rows[0]).not.toHaveProperty('invoice_count_total');
        expect(getQuery().getSql()).not.toContain('counted_invoice');
    });

    it.each(cases)('counts undated invoices in $alias independently of publication-year fallback', async ({ entity }) => {
        const { index, getQuery } = indexService(entity);
        // The existing UI sends reporting_year=null, transformed to NaN by Nest's number pipe.
        await index(Number.NaN);
        const sql = getQuery().getSql();
        expect(sql).toContain('"counted_invoice"."date" IS NULL');
        expect(getQuery().getParameters()).not.toHaveProperty('invoice_count_start');
    });

    it('counts each invoice once across both contract paths, including deleted publications', () => {
        const query = source.createQueryBuilder(Contract, 'contract').select('contract.id').groupBy('contract.id');
        addInvoiceCounts(query, 'contract_id', 2026);
        const sql = query.getSql();
        expect(sql).toContain('counted_publication."contractId" = "contract"."id" OR counted_component."contractId" = "contract"."id"');
        expect(sql).toContain('LEFT JOIN "publication" "counted_publication"');
        expect(sql).toContain('LEFT JOIN "contract_component" "counted_component"');
        expect(sql).not.toContain('delete_date');
        expect(sql).not.toContain('UNION ALL');
        expect(sql).not.toContain('cost_item');
    });

    it('matches cost types via EXISTS so multiple matching positions never duplicate an invoice', () => {
        const query = source.createQueryBuilder(CostType, 'cost_type').select('cost_type.id');
        addInvoiceCounts(query, 'cost_type_id', null);
        const sql = query.getSql();
        expect(sql).toContain('EXISTS (SELECT 1 FROM cost_item counted_item');
        expect(sql).toContain('counted_item."invoiceId" = "counted_invoice"."id"');
        expect(sql).toContain('counted_item."costTypeId" = "cost_type"."id"');
        expect(sql).not.toContain('JOIN "cost_item"');
    });

    it('correlates cost centers directly on the invoice, without requiring a publication or positions', () => {
        const query = source.createQueryBuilder(CostCenter, 'cost_center').select('cost_center.id');
        addInvoiceCounts(query, 'cost_center_id', 2026);
        expect(query.getSql()).toContain('counted_invoice."costCenterId" = "cost_center"."id"');
        expect(query.getSql()).not.toContain('JOIN');
    });

    it('keeps zero counts numeric for entities without invoices', () => {
        expect(normalizeInvoiceCounts([{ invoice_count: '0', invoice_count_total: '0' }] as never)).toEqual([
            { invoice_count: 0, invoice_count_total: 0 },
        ]);
    });
});
