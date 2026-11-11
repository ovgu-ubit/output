import { PublicationIndex } from '@output/interfaces';
import { Publication } from '../../publication/core/Publication.entity';
import { PublicationService } from '../../publication/core/publication.service';
import { MissingInvoiceDataService } from './missing-invoice-data-filter.service';
import { MissingInstFilterService } from './missing-inst-filter.service';
import { MissingInstAuthorFilterService } from './missing-inst-author-filter.service';

const cases = [
    {
        path: 'missing-invoice', type: MissingInvoiceDataService,
        matching: { authorPublications: [{ corresponding: true }], invoices: [], contract: null },
        nonMatching: [
            { authorPublications: [] },
            { authorPublications: [{ corresponding: false }] },
            { authorPublications: [{ corresponding: true }], invoices: [{ id: 7 }] },
            { authorPublications: [{ corresponding: true }], contract: { id: 8 } },
        ],
    },
    {
        path: 'missing-institute', type: MissingInstFilterService,
        matching: { authorPublications: [{ institute: null }] },
        nonMatching: [
            { authorPublications: [] },
            { authorPublications: [{ institute: { id: 7 } }] },
        ],
    },
    {
        path: 'missing-inst_auth', type: MissingInstAuthorFilterService,
        matching: { authorPublications: [] },
        nonMatching: [{ authorPublications: [{ id: 7 }] }],
    },
];

describe.each(cases)('$path deletion scope', ({ type, matching, nonMatching }) => {
    it.each(['entities', 'index entries'])('filters selected active and deleted %s without expanding the selection', async shape => {
        const records: Publication[] = [
            { id: 1, title: 'Active match', ...matching },
            { id: 2, title: 'Deleted match', delete_date: new Date('2026-01-01'), ...matching },
            ...nonMatching.flatMap((relations, index) => [
                { id: index * 2 + 3, title: 'Active non-match', ...relations },
                { id: index * 2 + 4, title: 'Deleted non-match', delete_date: new Date('2026-01-01'), ...relations },
            ]),
        ];
        const stored = new Map(records.map(record => [record.id, record]));
        stored.set(100, { id: 100, title: 'Not selected', ...matching });
        const find = jest.fn(async options => {
            const record = stored.get(options.where.id);
            return record && (!record.delete_date || options.withDeleted) ? [record] : [];
        });
        const publications = new PublicationService({ find } as never, {} as never, {} as never, {} as never, {} as never);
        const filter = new type(publications);
        const entities = [...records, { id: 999, title: 'Removed since selection' }];
        const input = shape === 'entities' ? entities : entities.map(({ id, title }) => ({ id, title }) as PublicationIndex);

        const result = await filter.filter(input);

        expect(result).toEqual([input[0], input[1]]);
        expect(result[0]).toBe(input[0]);
        expect(result[1]).toBe(input[1]);
        expect(find.mock.calls.map(([options]) => options.where.id)).toEqual(input.map(record => record.id));
    });
});
