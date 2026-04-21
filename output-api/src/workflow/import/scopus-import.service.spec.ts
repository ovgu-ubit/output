import { ScopusImportService } from './scopus-import.service';

describe('ScopusImportService', () => {
    const createService = (affiliationTags: string[]) => {
        const service = Object.create(ScopusImportService.prototype);
        service.affiliation_tags = affiliationTags;
        return service;
    };

    it('does not include authors whose afid belongs only to non-matching affiliations', () => {
        const service = createService([
            'ovgu',
            'guericke',
            'university magdeburg',
            'university of magdeburg',
            'university hospital magdeburg',
        ]);

        const result = service.getInstAuthors({
            affiliation: [
                {
                    afid: '60186291',
                    affilname: 'Leibniz Institute for Resilience Research',
                },
            ],
            author: [
                {
                    surname: 'Andres',
                    'given-name': 'Elena',
                    afid: [{ $: '60186291' }],
                },
            ],
        });

        expect(result).toEqual([]);
    });

    it('includes authors whose afid belongs to a matching affiliation', () => {
        const service = createService(['university hospital magdeburg']);

        const result = service.getInstAuthors({
            affiliation: [
                {
                    afid: '123',
                    affilname: 'University Hospital Magdeburg',
                },
            ],
            author: [
                {
                    surname: 'Mustermann',
                    'given-name': 'Max',
                    afid: [{ $: '123' }],
                },
            ],
        });

        expect(result).toEqual([{ last_name: 'Mustermann', first_name: 'Max' }]);
    });
});
