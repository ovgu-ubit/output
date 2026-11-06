import { CompareOperation, JoinOperation, SearchFilter } from '@output/interfaces';
import { DataSource, EntitySchema, Repository, SelectQueryBuilder } from 'typeorm';
import { Publication } from './Publication.entity';
import { PublicationIndexService } from './publication-index.service';

class ExportSelectionDataSource extends DataSource {
    async prepareMetadata(): Promise<void> { await this.buildMetadatas(); }
}

describe('Publication export deletion scope', () => {
    let repository: Repository<Publication>;
    let service: PublicationIndexService;
    let query: SelectQueryBuilder<Publication>;

    beforeAll(async () => {
        const source = new ExportSelectionDataSource({ type: 'postgres', entities: [new EntitySchema<Publication>({
            name: 'Publication', target: Publication, tableName: 'publication',
            columns: {
                id: { type: Number, primary: true },
                title: { type: String },
                delete_date: { type: 'timestamptz', nullable: true, deleteDate: true },
            },
        })] });
        await source.prepareMetadata();
        repository = source.getRepository(Publication);
    });

    beforeEach(() => {
        query = repository.createQueryBuilder('publication');
        // Relations are irrelevant to the publication's deletion scope. Keep
        // TypeORM's real WHERE generation and soft-delete handling under test.
        jest.spyOn(query, 'leftJoinAndSelect').mockReturnValue(query);
        jest.spyOn(query, 'getMany').mockResolvedValue([]);
        jest.spyOn(repository, 'createQueryBuilder').mockReturnValue(query);
        service = new PublicationIndexService(repository, {} as never, {} as never, {} as never);
    });

    afterEach(() => { jest.restoreAllMocks(); });

    const where = () => query.getQuery().replace(/"/g, '').split(' WHERE ')[1];
    const deletionFilter = (comp: CompareOperation, value: string | null, op = JoinOperation.AND): SearchFilter => ({
        expressions: [{ op, key: 'delete_date', comp, value }],
    });

    it.each([undefined, { expressions: [] }, { expressions: [
        { op: JoinOperation.AND, key: 'title', comp: CompareOperation.EQUALS, value: 'Example' },
    ] }])('excludes deleted publications without an explicit deletion filter: %p', async filter => {
        await service.getAll(filter);
        expect(where()).toContain('publication.delete_date IS NULL');
        expect(query.expressionMap.withDeleted).toBe(false);
    });

    it('allows explicitly filtering publications deleted after a date', async () => {
        await service.getAll(deletionFilter(CompareOperation.GREATER_THAN, '2026-01-01'));
        expect(where()).toContain('publication.delete_date > :filter_0');
        expect(where()).not.toContain('IS NULL');
        expect(query.getParameters()).toMatchObject({ filter_0: '2026-01-01' });
    });

    it('selects active publications with an explicit null deletion date', async () => {
        await service.getAll(deletionFilter(CompareOperation.EQUALS, null));
        expect(where()).toBe('publication.delete_date IS NULL');
        expect(query.getParameters()).toEqual({});
    });

    it('selects deleted publications by negating the null deletion-date predicate', async () => {
        await service.getAll(deletionFilter(CompareOperation.EQUALS, null, JoinOperation.AND_NOT));
        expect(where()).toBe('NOT (publication.delete_date IS NULL)');
        expect(query.getParameters()).toEqual({});
    });

    it('preserves OR expressions when deletion is explicitly filtered', async () => {
        await service.getAll({ expressions: [
            ...deletionFilter(CompareOperation.EQUALS, null).expressions,
            { op: JoinOperation.OR, key: 'title', comp: CompareOperation.EQUALS, value: 'Example' },
        ] });
        expect(where()).toBe('publication.delete_date IS NULL OR publication.title = :filter_1');
        expect(query.expressionMap.withDeleted).toBe(true);
    });
});
