import { EXPORT_ENTITY_TYPES } from '@output/interfaces';
import { ExportSourceService } from './export-source.service';

describe('ExportSourceService', () => {
    const listService = () => ({ get: jest.fn(), getForExport: jest.fn() });
    let service: ExportSourceService;
    let sources: ReturnType<typeof listService>[];
    let publication: { getAll: jest.Mock };
    let invoices: { getCostCenters: jest.Mock; getCostTypes: jest.Mock };

    beforeEach(() => {
        sources = Array.from({ length: 8 }, listService);
        publication = { getAll: jest.fn() };
        invoices = { getCostCenters: jest.fn(), getCostTypes: jest.fn() };
        service = new ExportSourceService(publication as any, ...sources as [any, any, any, any, any, any, any, any], invoices as any);
    });

    it.each(EXPORT_ENTITY_TYPES)('loads %s using only its domain service', async (source) => {
        const loaders = {
            publication: publication.getAll,
            author: sources[0].getForExport,
            institute: sources[1].get,
            greater_entity: sources[2].get,
            publisher: sources[3].getForExport,
            contract: sources[4].getForExport,
            funder: sources[5].getForExport,
            oa_category: sources[6].get,
            pub_type: sources[7].getForExport,
            cost_center: invoices.getCostCenters,
            cost_type: invoices.getCostTypes,
        };
        const records = [{ id: 12 }];
        const loader = loaders[source];
        loader.mockResolvedValue(records);

        expect(await service.load(source)).toBe(records);
        expect(loader).toHaveBeenCalledTimes(1);
        Object.values(loaders).filter(other => other !== loader).forEach(other => expect(other).not.toHaveBeenCalled());
        if (source === 'publication') expect(loader).toHaveBeenCalledWith(undefined, { serializeDates: true });
        if (source === 'author') expect(loader).toHaveBeenCalledWith({ rights: { read: true } });
    });

    it('passes field filters through to publication loading', async () => {
        publication.getAll.mockResolvedValue([]);
        const filter = { expressions: [] };
        await service.load('publication', filter);
        expect(publication.getAll).toHaveBeenCalledWith(filter, { serializeDates: true });
    });

    it.each(['invoice', 'toString', '__proto__'])('rejects unlisted sources: %s', (source) => {
        expect(() => service.load(source as any)).toThrow('Unsupported export source entity.');
    });
});
