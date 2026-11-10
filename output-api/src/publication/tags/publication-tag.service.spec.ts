import { PublicationTagService } from './publication-tag.service';
import { PublicationTagController } from './PublicationTagController';
import { hasApplicationRole } from '@output/interfaces';

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
