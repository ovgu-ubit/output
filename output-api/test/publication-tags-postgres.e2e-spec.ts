import { DataSource, getMetadataArgsStorage } from 'typeorm';
import { CompareOperation, JoinOperation } from '@output/interfaces';
import { Invoice } from '../src/invoice/Invoice.entity';
import { Publication } from '../src/publication/core/Publication.entity';
import { PublicationChange } from '../src/publication/core/PublicationChange.entity';
import { PublicationService } from '../src/publication/core/publication.service';
import { PublicationChangeService } from '../src/publication/core/publication-change.service';
import { PublicationIndexService } from '../src/publication/core/publication-index.service';
import { PublicationRelationService } from '../src/publication/relations/publication-relation.service';
import { WorkflowReport } from '../src/workflow/WorkflowReport.entity';
import { PublicationTag } from '../src/publication/tags/PublicationTag.entity';
import { PublicationTagAssignment } from '../src/publication/tags/PublicationTagAssignment.entity';
import { PublicationTagService } from '../src/publication/tags/publication-tag.service';
import { PublicationTags1794220000000 } from '../src/migrations/1794220000000-publication_tags';
import { EditLockOwnerStore } from '../src/common/edit-lock';

// Opt in only with a disposable local PostgreSQL database named output_tags_test*.
const url = process.env.PUBLICATION_TAGS_TEST_URL;
const integration = url ? describe : describe.skip;
integration('Publication tags on isolated PostgreSQL', () => {
    let source: DataSource;
    let tags: PublicationTagService;
    let publications: PublicationService;
    let index: PublicationIndexService;
    let first: PublicationTag;
    let second: PublicationTag;
    let id: number;
    const expression = (value: number | number[], op = JoinOperation.AND) => ({
        key: 'tag_id', comp: Array.isArray(value) ? CompareOperation.IN : CompareOperation.EQUALS, value, op,
    });

    beforeAll(async () => {
        const address = new URL(url!);
        if (!['127.0.0.1', 'localhost'].includes(address.hostname) || !address.pathname.startsWith('/output_tags_test')) {
            throw new Error('PUBLICATION_TAGS_TEST_URL must identify a disposable local output_tags_test database.');
        }
        void PublicationTagAssignment;
        source = new DataSource({ type: 'postgres', url,
            entities: getMetadataArgsStorage().tables.map(table => table.target as Function),
            migrations: [PublicationTags1794220000000],
        });
        await source.initialize();
        await source.dropDatabase();
        await source.synchronize();
        const runner = source.createQueryRunner();
        await new PublicationTags1794220000000().down(runner);
        await runner.release();
        await source.runMigrations();
        const config = { get: async (key: string) => key === 'pub_index_columns'
            ? { title: true, status: true, tags: true, net_costs: true } : key === 'lock_timeout' ? 5 : 2026 } as any;
        tags = new PublicationTagService(source, config);
        const changes = new PublicationChangeService(source.getRepository(Publication), source.getRepository(PublicationChange), source.getRepository(WorkflowReport), tags);
        publications = new PublicationService(source.getRepository(Publication), config, changes, source, new PublicationRelationService(source), tags);
        index = new PublicationIndexService(source.getRepository(Publication), config, {} as any, { applyPathsToQuery: query => query } as any, tags);
    }, 30000);

    beforeEach(async () => {
        EditLockOwnerStore.clear();
        await source.query('TRUNCATE publication, publication_tag RESTART IDENTITY CASCADE');
        first = await tags.save({ label: 'Rechnung fehlt', color: '#ffcc00' });
        second = await tags.save({ label: 'Affiliation prüfen' });
        [ { id } ] = await publications.saveOne({ title: 'Example', dataSource: 'test', pub_date: new Date('2026-01-01') }, 'alice');
    });

    afterAll(async () => {
        EditLockOwnerStore.clear();
        if (!source?.isInitialized) return;
        await source.undoLastMigration();
        expect(await source.query("SELECT to_regclass('public.publication_tag') AS table_name")).toEqual([{ table_name: null }]);
        await source.runMigrations();
        await source.destroy();
    });

    it('enforces case-insensitive uniqueness in PostgreSQL', async () => {
        await expect(tags.save({ label: ' rechnung FEHLT ' })).rejects.toMatchObject({ status: 409 });
    });

    it('saves tags atomically, preserves omitted tags and ignores importer read objects', async () => {
        await publications.updateEntries({ id, tag_ids: [first.id!] }, 'alice');
        await publications.updateEntries({ id, title: 'Edited' }, 'alice');
        await publications.save([{ id, tags: [second], tag_ids: [] }], { by_user: 'importer' });
        expect((await publications.getPublicationOrFail(id, true, false)).tags).toEqual([first]);
        expect((await publications.getPublicationOrFail(id, false, false)).tags).toBeUndefined();
        await expect(publications.updateEntries({ id, title: 'Must roll back', tag_ids: [99999] }, 'alice')).rejects.toMatchObject({ status: 404 });
        expect((await source.getRepository(Publication).findOneByOrFail({ id })).title).toBe('Edited');
        await publications.updateEntries({ id, tag_ids: [] }, 'alice');
        expect((await publications.getPublicationOrFail(id, true, false)).tags).toEqual([]);
    });

    it('adds/removes only requested tags and logs no-op operations only once', async () => {
        await tags.mutate({ publication_ids: [id], add_tag_ids: [first.id!] }, 'alice');
        const count = await source.getRepository(PublicationChange).count();
        expect(await tags.mutate({ publication_ids: [id], add_tag_ids: [first.id!] }, 'alice')).toEqual({ updated: 0 });
        expect(await source.getRepository(PublicationChange).count()).toBe(count);
        await tags.mutate({ publication_ids: [id], add_tag_ids: [second.id!] }, 'alice');
        await tags.mutate({ publication_ids: [id], remove_tag_ids: [first.id!] }, 'alice');
        expect((await publications.getPublicationOrFail(id, true, false)).tags).toEqual([second]);
    });

    it('rolls back earlier writes and history when a later batch write fails', async () => {
        const [other] = await publications.saveOne({ title: 'Other', dataSource: 'test' }, 'alice');
        const count = await source.getRepository(PublicationChange).count();
        const replace = tags.replace.bind(tags);
        const failure = jest.spyOn(tags, 'replace').mockImplementationOnce(replace).mockRejectedValueOnce(new Error('simulated later write failure'));
        try {
            await expect(tags.mutate({ publication_ids: [id, other.id!], add_tag_ids: [first.id!] }, 'alice')).rejects.toThrow('simulated');
        } finally { failure.mockRestore(); }
        expect(await source.getRepository(PublicationTagAssignment).count()).toBe(0);
        expect(await source.getRepository(PublicationChange).count()).toBe(count);
    });

    it('loads tags for a visible page in one batch', async () => {
        const others = await publications.save([{ title: 'Two', dataSource: 'test' }, { title: 'Three', dataSource: 'test' }], { by_user: 'alice' });
        await tags.mutate({ publication_ids: [id, ...others.map(pub => pub.id!)], add_tag_ids: [first.id!] }, 'alice');
        const find = jest.spyOn(source.getRepository(PublicationTagAssignment), 'find');
        try {
            const page = await index.getIndexPage({ all_reporting_years: true, include_tags: true, page_size: 2 }, true);
            expect(page.total).toBe(3);
            expect(page.items).toHaveLength(2);
            expect(page.items.every(pub => pub.tags?.length === 1)).toBe(true);
            expect(find).toHaveBeenCalledTimes(1);
        } finally { find.mockRestore(); }
    });

    it('rolls back whole batches and catalogue deletion when a publication is edit-locked', async () => {
        const [other] = await publications.saveOne({ title: 'Other', dataSource: 'test' }, 'alice');
        await tags.mutate({ publication_ids: [id, other.id!], add_tag_ids: [first.id!] }, 'alice');
        await source.getRepository(Publication).update(other.id!, { locked_at: new Date() });
        EditLockOwnerStore.setOwner('publication', other.id!, 'bob');
        await expect(tags.mutate({ publication_ids: [id, other.id!], remove_tag_ids: [first.id!] }, 'alice')).rejects.toMatchObject({ status: 409 });
        await expect(tags.delete([first.id!], 'alice')).rejects.toMatchObject({ status: 409 });
        expect(await source.getRepository(PublicationTagAssignment).count()).toBe(2);
        expect(await tags.one(first.id!)).toEqual(first);
    });

    it('retains soft-deleted assignments, cleans deletion and preserves historical labels', async () => {
        await tags.mutate({ publication_ids: [id], add_tag_ids: [first.id!] }, 'alice');
        await publications.delete([{ id }], true);
        expect(await source.getRepository(PublicationTagAssignment).count()).toBe(1);
        await tags.delete([first.id!], 'alice');
        expect(await source.getRepository(PublicationTagAssignment).count()).toBe(0);
        const history = await publications.getPublicationChanges(id);
        expect(history.some(change => JSON.stringify(change.patch_data).includes('Rechnung fehlt'))).toBe(true);
        await publications.delete([{ id }], false);
    });

    it('blocks tag writes on locked publications, including batches, while allowing explicit unlocking', async () => {
        const [other] = await publications.saveOne({ title: 'Other', dataSource: 'test' }, 'alice');
        await tags.mutate({ publication_ids: [id], add_tag_ids: [first.id!] }, 'alice');
        await publications.updateEntries({ id, locked: true }, 'alice');
        await expect(publications.updateEntries({ id, tag_ids: [] }, 'alice')).rejects.toMatchObject({ status: 409 });
        await expect(tags.mutate({ publication_ids: [id, other.id!], add_tag_ids: [second.id!] }, 'alice')).rejects.toMatchObject({ status: 409 });
        await expect(tags.delete([first.id!], 'alice')).rejects.toMatchObject({ status: 409 });
        expect((await publications.getPublicationOrFail(id, true, false)).tags).toEqual([first]);
        expect((await publications.getPublicationOrFail(other.id!, true, false)).tags).toEqual([]);
        await publications.updateEntries({ id, locked: false, tag_ids: [second.id!] }, 'alice');
        expect((await publications.getPublicationOrFail(id, true, false)).tags).toEqual([second]);
    });

    it('filters and paginates without duplicate rows, including exclusions and deleted tag IDs', async () => {
        await publications.saveOne({ title: 'Untagged', dataSource: 'test' }, 'alice');
        await tags.mutate({ publication_ids: [id], add_tag_ids: [first.id!, second.id!] }, 'alice');
        await source.getRepository(Invoice).save({ publication: { id }, booking_amount: 123 });
        const request = { page: 0, page_size: 10, all_reporting_years: true, include_tags: true };
        const both = await index.getIndexPage({ ...request, filter: { expressions: [expression(first.id!), expression(second.id!)] } }, true);
        expect(both.total).toBe(1);
        expect(Number(both.items[0].net_costs)).toBe(123);
        expect(both.items[0].tags).toHaveLength(2);
        expect((await index.getIndexPage({ ...request, filter: { expressions: [expression([first.id!, second.id!])] } }, true)).total).toBe(1);
        expect((await index.getIndexPage({ ...request, filter: { expressions: [expression(first.id!, JoinOperation.AND_NOT)] } }, true)).total).toBe(1);
        expect((await index.getIndexPage({ ...request, q: 'Affiliation', search_columns: ['tags'], sort: [{ key: 'tags', direction: 'asc' }] }, true)).total).toBe(1);
        await expect(index.getIndexPage({ ...request }, false)).rejects.toMatchObject({ status: 403 });
        await expect(index.filterIndex({ expressions: [expression(first.id!)] }, false)).rejects.toMatchObject({ status: 403 });
        await expect(index.getAll({ expressions: [expression(first.id!)] })).rejects.toMatchObject({ status: 403 });
        expect((await index.getIndexPage({ all_reporting_years: true }, false)).items.every(pub => pub.tags === undefined)).toBe(true);
        await tags.delete([first.id!], 'alice');
        expect((await index.getIndexPage({ ...request, filter: { expressions: [expression(first.id!)] } }, true)).total).toBe(0);
    });

    it('unites tags during publication merge and cleans assignments on physical deletion', async () => {
        const [other] = await publications.saveOne({ title: 'Duplicate', dataSource: 'test' }, 'alice');
        await tags.mutate({ publication_ids: [id], add_tag_ids: [first.id!] }, 'alice');
        await tags.mutate({ publication_ids: [other.id!], add_tag_ids: [second.id!] }, 'alice');
        await publications.combine(id, [other.id!]);
        expect((await publications.getPublicationOrFail(id, true, false)).tags).toHaveLength(2);
        expect(await source.getRepository(PublicationTagAssignment).count()).toBe(2);
        await publications.delete([{ id }], false);
        expect(await source.getRepository(PublicationTagAssignment).count()).toBe(0);
    });

    it('resolves import labels and adds tags atomically without replacing existing assignments', async () => {
        await tags.mutate({ publication_ids: [id], add_tag_ids: [first.id!] }, 'alice');
        const plan = await publications.planImportTags([' AFFILIATION PRÜFEN ', 'Unknown', second.label], id);
        expect(plan.missingLabels).toEqual(['Unknown']);
        expect(plan.addTagIds).toEqual([second.id]);
        expect(await source.getRepository(PublicationTagAssignment).count()).toBe(1);
        expect(await source.getRepository(PublicationTag).count()).toBe(2);
        await publications.save([{ id, title: 'Imported update' }], { by_user: 'importer', addTagIds: plan.addTagIds });
        expect((await publications.getPublicationOrFail(id, true, false)).tags).toHaveLength(2);
        const history = await publications.getPublicationChanges(id);
        expect(history.some(change => JSON.stringify(change.patch_data).includes('Affiliation prüfen'))).toBe(true);
        const repeat = await publications.planImportTags([second.label], id);
        expect(repeat.addTagIds).toEqual([]);
    });

    it('assigns import tags to new publications and rejects stale tags without partial publication writes', async () => {
        const plan = await publications.planImportTags([second.label]);
        const [created] = await publications.save([{ title: 'New import', dataSource: 'test' }], { by_user: 'importer', addTagIds: plan.addTagIds });
        expect((await publications.getPublicationOrFail(created.id!, true, false)).tags).toEqual([second]);
        await tags.delete([first.id!], 'alice');
        await expect(publications.save([{ id, title: 'Must roll back' }], { by_user: 'importer', addTagIds: [first.id!] }))
            .rejects.toMatchObject({ status: 404 });
        expect((await source.getRepository(Publication).findOneByOrFail({ id })).title).toBe('Example');
    });

    it('does not overwrite a lock acquired after import lookup', async () => {
        const plan = await publications.planImportTags([second.label], id);
        await source.getRepository(Publication).update(id, { locked: true });
        await expect(publications.save([{ id, title: 'Must roll back', locked: false }], { by_user: 'importer', addTagIds: plan.addTagIds }))
            .rejects.toMatchObject({ status: 409 });
        const stored = await publications.getPublicationOrFail(id, true, false);
        expect(stored.locked).toBe(true);
        expect(stored.title).toBe('Example');
        expect(stored.tags).toEqual([]);
    });
});
