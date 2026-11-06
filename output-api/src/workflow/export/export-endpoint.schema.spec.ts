import { HttpException } from '@nestjs/common';
import { ExportStrategy } from '@output/interfaces';
import { validateExportWorkflow } from '../export-workflow.schema';
import { parseExportEndpointRequest } from './export-endpoint.schema';

const workflow = () => ({
    workflow_id: 'publications', label: 'Publications', strategy_type: ExportStrategy.ENDPOINT,
    strategy: { endpoint_name: 'publications', format: 'json' },
});

describe('Endpoint export validation', () => {
    it.each([ExportStrategy.ENDPOINT, 'ENDPOINT'])('accepts %p and defaults to protected publications', strategy_type => {
        expect(validateExportWorkflow({ ...workflow(), strategy_type: strategy_type as ExportStrategy })).toMatchObject({
            strategy_type: ExportStrategy.ENDPOINT, source_entity: 'publication',
            strategy: { access: 'authenticated', endpoint_name: 'publications' },
        });
    });

    it.each(['json', 'xml', 'csv', 'xlsx'])('supports %s with public access', format => {
        expect(validateExportWorkflow({ ...workflow(), strategy: {
            ...workflow().strategy, format, access: 'public', root_name: 'export', item_name: 'item',
            delimiter: ';', quote_char: '"', sheet_name: 'Export',
        } }).strategy).toMatchObject({ format, access: 'public', endpoint_name: 'publications' });
    });

    it.each(['', '1test', 'Test', 'a/b', 'with_space', 'a'.repeat(101)])('rejects endpoint name %p', endpoint_name => {
        expect(() => validateExportWorkflow({ ...workflow(), strategy: { ...workflow().strategy, endpoint_name } })).toThrow(HttpException);
    });

    it('accepts the maximum name length', () => {
        expect(validateExportWorkflow({ ...workflow(), strategy: { ...workflow().strategy, endpoint_name: 'a'.repeat(100) } }).strategy.endpoint_name).toHaveLength(100);
    });

    it('rejects other sources and invalid access modes', () => {
        expect(() => validateExportWorkflow({ ...workflow(), source_entity: 'author' })).toThrow(HttpException);
        expect(() => validateExportWorkflow({ ...workflow(), strategy: { ...workflow().strategy, access: 'invalid' } })).toThrow(HttpException);
    });

    it('requires a mapping when publishing', () => {
        expect(() => validateExportWorkflow({ ...workflow(), published_at: new Date() })).toThrow(HttpException);
    });

    it('does not accept endpoint settings on an HTTP_RESPONSE workflow', () => {
        expect(() => validateExportWorkflow({ ...workflow(), strategy_type: ExportStrategy.HTTP_RESPONSE })).toThrow(HttpException);
    });

    it('defaults an empty request to all publications', () => {
        expect(parseExportEndpointRequest(undefined)).toEqual({ filter: { expressions: [] }, paths: [] });
        expect(parseExportEndpointRequest({})).toEqual(parseExportEndpointRequest(undefined));
    });

    it.each([null, [], { filter: null }, { filter: {} }, { paths: 'test' }, { mapping: '$' },
        { filter: { expressions: [{ op: 99, key: 'title', comp: 0, value: 'test' }] } },
        { filter: { expressions: [{ op: 0, key: 'title', comp: 0 }] } },
    ])('rejects invalid request %p', body => {
        expect(() => parseExportEndpointRequest(body)).toThrow(HttpException);
    });

    it('preserves null and array filter values', () => {
        const body = { filter: { expressions: [
            { op: 0, key: 'title', comp: 1, value: null },
            { op: 0, key: 'title', comp: 5, value: ['a', 'b'] },
        ] }, paths: ['selected'] };
        expect(parseExportEndpointRequest(body)).toEqual(body);
    });
});
