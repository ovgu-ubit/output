import { BadRequestException } from '@nestjs/common';
import { Strategy } from '../../../output-interfaces/Workflow';
import { validateImportWorkflow } from './import-workflow.schema';

describe('validateImportWorkflow', () => {
    it('accepts URL_LOOKUP_AND_RETRIEVE workflows with generic lookup/retrieve parameters', () => {
        const workflow = {
            workflow_id: 'wf-lookup',
            label: 'Lookup import',
            strategy_type: Strategy.URL_LOOKUP_AND_RETRIEVE,
            mapping: '$',
            strategy: {
                url_lookup: 'https://example.org/search?term=[search_tags]',
                url_retrieve: 'https://example.org/items/[id]',
                max_res: 100,
                max_res_name: 'retmax',
                request_mode: 'offset',
                offset_name: 'retstart',
                offset_start: 0,
                delayInMs: 0,
                parallelCalls: 1,
                get_count: '$.count',
                get_lookup_ids: '$.ids',
                get_retrieve_item: '$.item',
                search_text_combiner: '+',
                exclusion_criteria: 'false',
                only_import_if_authors_inst: false,
                format: 'xml',
            },
        } as any;

        expect(validateImportWorkflow(workflow)).toMatchObject({
            strategy_type: 'URL_LOOKUP_AND_RETRIEVE',
            strategy: expect.objectContaining({
                url_lookup: workflow.strategy.url_lookup,
                url_retrieve: workflow.strategy.url_retrieve,
                get_lookup_ids: workflow.strategy.get_lookup_ids,
                get_retrieve_item: workflow.strategy.get_retrieve_item,
            }),
        });
    });

    it('rejects URL_LOOKUP_AND_RETRIEVE workflows when get_lookup_ids is missing', () => {
        const workflow = {
            workflow_id: 'wf-lookup',
            label: 'Lookup import',
            strategy_type: Strategy.URL_LOOKUP_AND_RETRIEVE,
            mapping: '$',
            strategy: {
                url_lookup: 'https://example.org/search',
                url_retrieve: 'https://example.org/items/[id]',
                max_res: 100,
                max_res_name: 'retmax',
                request_mode: 'offset',
                offset_name: 'retstart',
                offset_start: 0,
                delayInMs: 0,
                parallelCalls: 1,
                get_count: '$.count',
                get_retrieve_item: '$.item',
                exclusion_criteria: 'false',
                only_import_if_authors_inst: false,
                format: 'json',
            },
        } as any;

        try {
            validateImportWorkflow(workflow);
            fail('validateImportWorkflow should throw for incomplete lookup strategy');
        } catch (error) {
            expect(error).toBeInstanceOf(BadRequestException);
            expect(error.getResponse()).toMatchObject({
                message: 'Validation failed',
                details: expect.arrayContaining([
                    expect.objectContaining({
                        path: 'strategy.get_lookup_ids',
                    }),
                ]),
            });
        }
    });
});
