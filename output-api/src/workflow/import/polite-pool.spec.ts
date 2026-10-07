import { readFileSync } from 'fs';
import { resolve } from 'path';
import { CrossrefEnrichService } from './crossref-enrich.service';
import { CrossrefImportService } from './crossref-import.service';
import { OpenAlexEnrichService } from './openalex-enrich.service';
import { OpenAlexImportService } from './openalex-import.service';

describe('polite pool configuration for legacy imports and enriches', () => {
    it('adds the Crossref mailto parameter to imports', async () => {
        const service = Object.create(CrossrefImportService.prototype);
        service.configService = {
            get: jest.fn((key: string) => {
                if (key === 'search_tags') return ['University'];
                if (key === 'affiliation_tags') return ['University'];
                if (key === 'SECRET_CROSSREF') return 'contact@example.org';
            }),
        };
        service.searchText = '';

        await service.setReportingYear('2026');

        expect(service.params).toContainEqual({ key: 'mailto', value: 'contact@example.org' });
    });

    it('adds the Crossref mailto parameter to enriches', async () => {
        const service = Object.create(CrossrefEnrichService.prototype);
        service.configService = {
            get: jest.fn((key: string) => {
                if (key === 'search_tags') return ['University'];
                if (key === 'affiliation_tags') return ['University'];
                if (key === 'SECRET_CROSSREF') return 'contact@example.org';
            }),
        };
        service.searchText = '';

        await service.init();

        expect(service.param_string).toBe('mailto=contact@example.org');
    });

    it('adds the OpenAlex api_key parameter to imports', async () => {
        const service = Object.create(OpenAlexImportService.prototype);
        service.configService = {
            get: jest.fn((key: string) => {
                if (key === 'openalex_id') return ['I123'];
                if (key === 'SECRET_OPENALEX') return 'openalex-secret';
            }),
        };

        await service.setReportingYear('2026');

        expect(service.params).toContainEqual({ key: 'api_key', value: 'openalex-secret' });
    });

    it('adds the OpenAlex api_key parameter to enriches', async () => {
        const service = Object.create(OpenAlexEnrichService.prototype);
        service.configService = {
            get: jest.fn((key: string) => {
                if (key === 'openalex_id') return ['I123'];
                if (key === 'SECRET_OPENALEX') return 'openalex-secret';
            }),
        };

        await service.init();

        expect(service.param_string).toBe('api_key=openalex-secret');
    });
});

describe('polite pool workflow templates', () => {
    it.each([
        ['Crossref Import_v3.json', 3, ['url_count', 'url_items'], 'mailto=[SECRET_CROSSREF]'],
        ['Crossref Enrich_v2.json', 2, ['url_doi'], 'mailto=[SECRET_CROSSREF]'],
        ['OpenAlex Import_v3.json', 3, ['url_count', 'url_items'], 'api_key=[SECRET_OPENALEX]'],
        ['OpenAlex Enrich_v3.json', 3, ['url_doi'], 'api_key=[SECRET_OPENALEX]'],
    ])('provides %s with version %i and polite-pool parameters', (file, version, urlKeys, parameter) => {
        const template = JSON.parse(readFileSync(resolve(__dirname, `../../../templates/import/${file}`), 'utf-8'));

        expect(template.version).toBe(version);
        for (const urlKey of urlKeys) {
            expect(template.strategy[urlKey]).toContain(parameter);
        }
    });
});
