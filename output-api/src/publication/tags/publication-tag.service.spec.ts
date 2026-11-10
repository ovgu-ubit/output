import { PublicationTagService } from './publication-tag.service';
import { PublicationTagController } from './PublicationTagController';
import { hasApplicationRole } from '@output/interfaces';
import { PublicationTagAssignment } from './PublicationTagAssignment.entity';

describe('Publication tag validation and permissions', () => {
    const repo = { save: jest.fn(async value => value), existsBy: jest.fn(async () => true) };
    const service = new PublicationTagService({ getRepository: () => repo } as any, {} as any);

    beforeEach(() => jest.clearAllMocks());

    it('normalizes names and optional values and accepts six-digit colors', async () => {
        await expect(service.save({ label: '  Rechnung fehlt  ', description: '  Hinweis  ', color: '#aAbB00' }))
            .resolves.toEqual({ label: 'Rechnung fehlt', description: 'Hinweis', color: '#aAbB00' });
    });

    it.each([
        { label: ' ' }, { label: 'Tag', color: 'red' }, { label: 'Tag', color: '#abc' },
        { label: 'Tag', description: 17 }, { label: 'Tag', id: 1 },
    ])('rejects invalid catalogue writes before persistence: %p', async value => {
        await expect(service.save(value as any)).rejects.toMatchObject({ status: 400 });
        expect(repo.save).not.toHaveBeenCalled();
    });

    it.each([null, '1,2', [null], [1.5], [-1], [true], ['1']])('rejects invalid ID arrays: %p', value => {
        expect(() => service.ids(value)).toThrow();
    });

    it('deduplicates IDs and rejects conflicting add/remove operations', async () => {
        expect(service.ids([3, 1, 3])).toEqual([1, 3]);
        await expect(service.mutate({ publication_ids: [1], add_tag_ids: [2], remove_tag_ids: [2] }))
            .rejects.toMatchObject({ status: 400 });
    });

    it('rejects assignment changes on locked publications', () => {
        expect(() => service.assertAssignmentsEditable([{ id: 1, locked: false }, { id: 2, locked: true }])).toThrow();
        expect(() => service.assertAssignmentsEditable([{ id: 1, locked: false }])).not.toThrow();
    });

    it('restricts catalogue writes to admins while publication writers inherit read access', () => {
        for (const action of ['save', 'update', 'delete'] as const) {
            expect(Reflect.getMetadata('permissions', PublicationTagController.prototype[action]))
                .toEqual([{ role: 'admin', app: 'output' }]);
        }
        const permissions = Reflect.getMetadata('permissions', PublicationTagController.prototype.all);
        expect(permissions.some(permission => hasApplicationRole([{ appname: 'output', rolename: 'publication_writer' }], permission.app, permission.role))).toBe(true);
    });
});

describe('Publication tag import planning', () => {
    const existing = { id: 1, label: 'Existing' };
    const review = { id: 2, label: 'Review' };
    const query = { where: jest.fn().mockReturnThis(), getMany: jest.fn() };
    const catalogue = { createQueryBuilder: () => query, save: jest.fn() };
    const assignments = { find: jest.fn(), insert: jest.fn(), delete: jest.fn() };
    const source = { getRepository: () => catalogue, manager: {
        getRepository: (entity: unknown) => entity === PublicationTagAssignment ? assignments : catalogue,
    } };
    const service = new PublicationTagService(source as any, {} as any);

    beforeEach(() => {
        jest.clearAllMocks();
        query.getMany.mockResolvedValue([review]);
        assignments.find.mockResolvedValue([{ publication_id: 7, tag_id: 1, tag: existing }]);
    });

    it('matches normalized labels, preserves existing tags and reports unknown labels without writing', async () => {
        const plan = await service.planImportTags([' Review ', 'REVIEW', 'Unknown'], 7);
        expect(plan).toEqual({ tags: [existing, review], addTagIds: [2], missingLabels: ['Unknown'] });
        expect(query.where).toHaveBeenCalledWith(expect.any(String), { labels: ['review', 'unknown'] });
        expect(catalogue.save).not.toHaveBeenCalled();
        expect(assignments.insert).not.toHaveBeenCalled();
        expect(assignments.delete).not.toHaveBeenCalled();
    });

    it('does not schedule assignments which already exist', async () => {
        assignments.find.mockResolvedValue([{ publication_id: 7, tag_id: 2, tag: review }]);
        expect((await service.planImportTags(['Review'], 7)).addTagIds).toEqual([]);
    });

    it.each(['Review', [{ id: 2 }], [2], [''], ['   '], [null]])('rejects malformed tag mappings: %p', async value => {
        await expect(service.planImportTags(value)).rejects.toMatchObject({ status: 400 });
        expect(query.getMany).not.toHaveBeenCalled();
    });
});
