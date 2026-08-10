import { OpenAlexImportService } from './openalex-import.service';

describe('OpenAlexImportService', () => {
    const createService = () => {
        const service = Object.create(OpenAlexImportService.prototype);
        service.id = 'I123';
        return service;
    };

    it.each([
        ['Doe, Jane', 'Jane', 'Doe'],
        ['Jane Doe', 'Jane', 'Doe'],
    ])('joins affiliations without a leading separator for %s', (displayName, firstName, lastName) => {
        const service = createService();

        const result = service.getInstAuthors({
            authorships: [{
                institutions: [{ id: 'https://openalex.org/I123' }],
                author: { display_name: displayName, orcid: null },
                raw_affiliation_strings: ['University A', 'Institute B'],
                is_corresponding: false,
            }],
        });

        expect(result).toEqual([{
            first_name: firstName,
            last_name: lastName,
            orcid: undefined,
            affiliation: 'University A; Institute B',
            corresponding: false,
        }]);
    });

    it('returns an empty affiliation for an empty affiliation list', () => {
        const service = createService();

        const [author] = service.getInstAuthors({
            authorships: [{
                institutions: [{ id: 'https://openalex.org/I123' }],
                author: { display_name: 'Jane Doe', orcid: null },
                raw_affiliation_strings: [],
                is_corresponding: false,
            }],
        });

        expect(author.affiliation).toBe('');
    });
});
