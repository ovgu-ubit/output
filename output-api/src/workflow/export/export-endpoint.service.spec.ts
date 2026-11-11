import { CompareOperation, JoinOperation } from '@output/interfaces';
import { ExportEndpointService } from './export-endpoint.service';

describe('Export endpoint tag-filter access', () => {
    const exporter = { setUp: jest.fn(), export: jest.fn() };
    const modules = { create: jest.fn() };
    const service = new ExportEndpointService({} as never, modules as never, {} as never);
    const body = { filter: { expressions: [{ op: JoinOperation.AND, key: 'tag_id', comp: CompareOperation.EQUALS, value: 7 }] } };

    beforeEach(() => {
        jest.clearAllMocks();
        modules.create.mockResolvedValue(exporter);
        exporter.export.mockResolvedValue('export');
    });

    it('retains the tag-filter restriction for public export endpoints', async () => {
        await expect(service.run({ strategy: { access: 'public' } } as never, body))
            .rejects.toMatchObject({ status: 403 });
        expect(modules.create).not.toHaveBeenCalled();
    });

    it('permits tag filters on authenticated export endpoints', async () => {
        await expect(service.run({ strategy: { access: 'authenticated' } } as never, body, 'alice')).resolves.toBe('export');
        expect(exporter.export).toHaveBeenCalledWith({ ...body, paths: [] }, undefined, 'alice', false, expect.any(Function));
    });

    it('continues to allow ordinary public export filters', async () => {
        const filter = { expressions: [{ op: JoinOperation.AND, key: 'title', comp: CompareOperation.EQUALS, value: 'Example' }] };
        await expect(service.run({ strategy: { access: 'public' } } as never, { filter })).resolves.toBe('export');
    });
});
