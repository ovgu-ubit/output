import { CrossrefEnrichService } from './crossref-enrich.service';
import { CrossrefImportService } from './crossref-import.service';
import { PubMedImportService } from './pubmed-import';

describe('legacy affiliation filters', () => {
    const createService = (serviceType: any, affiliationTags: string[]) => {
        const service = Object.create(serviceType.prototype);
        service.affiliation_tags = affiliationTags;
        return service;
    };

    describe.each([
        ['CrossrefImportService', CrossrefImportService],
        ['CrossrefEnrichService', CrossrefEnrichService],
    ])('%s', (_name, serviceType) => {
        it('keeps only authors with matching affiliations', () => {
            const service = createService(serviceType, ['university hospital magdeburg']);

            const result = service.authorsInstitution([
                {
                    family: 'Andres',
                    given: 'Elena',
                    affiliation: [{ name: 'Leibniz Institute for Resilience Research' }],
                },
                {
                    family: 'Mustermann',
                    given: 'Max',
                    affiliation: [
                        { name: 'University Hospital Magdeburg' },
                        { name: 'Other Institute' },
                    ],
                },
            ]);

            expect(result).toEqual([
                {
                    family: 'Mustermann',
                    given: 'Max',
                    affiliation: [{ name: 'University Hospital Magdeburg' }],
                },
            ]);
        });
    });

    describe('PubMedImportService', () => {
        it('does not treat every author in an array as an institution author', () => {
            const service = createService(PubMedImportService, ['university hospital magdeburg']);

            const result = service.authorsInstitution([
                {
                    AffiliationInfo: {
                        Affiliation: {
                            _text: 'Leibniz Institute for Resilience Research',
                        },
                    },
                },
            ]);

            expect(result).toBe(false);
        });

        it('detects institution authors in author arrays', () => {
            const service = createService(PubMedImportService, ['university hospital magdeburg']);

            const result = service.authorsInstitution([
                {
                    AffiliationInfo: {
                        Affiliation: {
                            _text: 'University Hospital Magdeburg',
                        },
                    },
                },
            ]);

            expect(result).toBe(true);
        });
    });
});
