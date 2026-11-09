import { DataSource, getMetadataArgsStorage } from 'typeorm';
import { GEIdentifier } from '../greater_entity/GEIdentifier.entity';
import { GreaterEntity } from '../greater_entity/GreaterEntity.entity';
import { GreaterEntityService } from '../greater_entity/greater-entitiy.service';
import { Invoice } from '../invoice/Invoice.entity';
import { InvoiceService } from '../invoice/invoice.service';
import { Publication } from '../publication/core/Publication.entity';

class MetadataDataSource extends DataSource {
    async prepare(): Promise<void> { await this.buildMetadatas(); }
}

describe('PostgreSQL relation compatibility', () => {
    let source: MetadataDataSource;

    beforeAll(async () => {
        source = new MetadataDataSource({
            type: 'postgres',
            entities: getMetadataArgsStorage().tables.map(table => table.target as Function),
        });
        await source.prepare();
    });

    afterEach(() => jest.restoreAllMocks());

    it.each([
        ['author_institutes_institute', 'institute'],
        ['publication_funders_funder', 'funder'],
    ])('preserves explicit cleanup before changing referenced %s rows', (table, referencedTable) => {
        const junction = source.entityMetadatas.find(metadata => metadata.tableName === table);
        const foreignKey = junction?.foreignKeys.find(key => key.referencedTablePath === referencedTable);

        expect(foreignKey).toMatchObject({ onDelete: 'NO ACTION', onUpdate: 'NO ACTION' });
    });

    it.each([0, 41])('finds identifiers for existing greater entity %i with nullable fields', async id => {
        const existing: GreaterEntity = {
            id, label: 'Existing journal', rating: null, doaj_since: null, doaj_until: null,
        };
        const repository = source.getRepository(GreaterEntity);
        const identifiers = source.getRepository(GEIdentifier);
        jest.spyOn(repository, 'find').mockResolvedValue([existing]);
        let parameters: unknown[];
        jest.spyOn(identifiers, 'find').mockImplementation(async options => {
            const query = identifiers.createQueryBuilder().setFindOptions(options);
            parameters = query.getQueryAndParameters()[1];
            return [];
        });
        const service = new GreaterEntityService(repository, identifiers, undefined, undefined, source);

        await expect(service.findOrSave({ label: existing.label }, true)).resolves.toBe(existing);
        expect(parameters).toEqual([id]);
    });

    it('finds invoices by publication ID even when the publication has nullable fields', async () => {
        const repository = source.getRepository(Invoice);
        const publication: Publication = { id: 7, title: 'Example', doi: null, pub_date: null };
        const invoices: Invoice[] = [{ id: 3, publication }];
        let parameters: unknown[];
        jest.spyOn(repository, 'find').mockImplementation(async options => {
            const query = repository.createQueryBuilder().setFindOptions(options);
            parameters = query.getQueryAndParameters()[1];
            return invoices;
        });
        const service = new InvoiceService(repository, source.getRepository(Publication),
            undefined, undefined, undefined, source);

        await expect(service.getForPub(publication)).resolves.toBe(invoices);
        expect(parameters).toEqual([publication.id]);
    });
});
