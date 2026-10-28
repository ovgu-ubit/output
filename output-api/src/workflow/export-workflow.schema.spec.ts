import { HttpException } from '@nestjs/common';
import {  ApiErrorCode  } from '@output/interfaces';
import { EXPORT_ENTITY_TYPES, ExportStrategy } from '@output/interfaces';
import { validateExportWorkflow } from './export-workflow.schema';

describe('validateExportWorkflow', () => {
    it.each([undefined, null, '', ' \n '])('accepts draft strategies before mapping is written: %p', (mapping) => {
        const workflow = {
            workflow_id: 'draft-export', label: 'Draft export', source_entity: 'author' as const,
            strategy_type: ExportStrategy.HTTP_RESPONSE,
            strategy: { format: 'json', disposition: 'inline' },
            mapping, published_at: null,
        };

        expect(validateExportWorkflow(workflow)).toMatchObject({
            strategy_type: ExportStrategy.HTTP_RESPONSE,
            strategy: workflow.strategy,
            source_entity: 'author',
            mapping,
        });
    });

    it.each([undefined, null, '', ' \n '])('requires a mapping for publication even without a strategy: %p', (mapping) => {
        for (const strategy_type of [undefined, ExportStrategy.HTTP_RESPONSE]) {
            try {
                validateExportWorkflow({
                    workflow_id: 'draft-export', label: 'Draft export', published_at: new Date(), mapping,
                    strategy_type, strategy: { format: 'json', disposition: 'inline' },
                });
                fail('Publication without a mapping should fail');
            } catch (error) {
                expect((error as HttpException).getResponse()).toMatchObject({
                    code: ApiErrorCode.VALIDATION_FAILED,
                    details: expect.arrayContaining([expect.objectContaining({ path: 'mapping' })]),
                });
            }
        }
    });

    it('still rejects an invalid strategy when the draft mapping is missing', () => {
        try {
            validateExportWorkflow({
                workflow_id: 'draft-export', label: 'Draft export', strategy_type: ExportStrategy.HTTP_RESPONSE,
                strategy: { format: 'xml', root_name: 'records' },
            });
            fail('Invalid strategy should fail');
        } catch (error) {
            expect((error as HttpException).getResponse()).toMatchObject({
                code: ApiErrorCode.VALIDATION_FAILED,
                details: expect.arrayContaining([expect.objectContaining({ path: 'strategy.item_name' })]),
            });
        }
    });

    it.each(EXPORT_ENTITY_TYPES)('accepts the source %s even in an incomplete draft', (source_entity) => {
        expect(validateExportWorkflow({ source_entity })).toMatchObject({ source_entity });
    });

    it('defaults old definitions and incomplete drafts to publications', () => {
        expect(validateExportWorkflow({})).toMatchObject({ source_entity: 'publication' });
    });

    it.each(['invoice', '', null, 123])('rejects an invalid source in an incomplete draft: %p', (source_entity) => {
        try {
            validateExportWorkflow({ source_entity } as any);
            fail('Invalid source should fail');
        } catch (error) {
            expect((error as HttpException).getResponse()).toMatchObject({
                code: ApiErrorCode.VALIDATION_FAILED,
                details: [expect.objectContaining({ path: 'source_entity' })],
            });
        }
    });
    it('accepts JSON HTTP_RESPONSE workflows', () => {
        const workflow = {
            workflow_id: 'wf-json',
            label: 'JSON export',
            strategy_type: ExportStrategy.HTTP_RESPONSE,
            mapping: '$',
            strategy: {
                format: 'json',
                disposition: 'inline',
            },
        } as any;

        expect(validateExportWorkflow(workflow)).toMatchObject({
            strategy_type: ExportStrategy.HTTP_RESPONSE,
            strategy: expect.objectContaining({
                format: 'json',
                disposition: 'inline',
            }),
        });
    });

    it('accepts string strategy_type and normalizes it to enum value', () => {
        const workflow = {
            workflow_id: 'wf-json-string',
            label: 'JSON export',
            strategy_type: 'HTTP_RESPONSE',
            mapping: '$',
            strategy: {
                format: 'json',
                disposition: 'inline',
            },
        } as any;

        expect(validateExportWorkflow(workflow)).toMatchObject({
            strategy_type: ExportStrategy.HTTP_RESPONSE,
            strategy: expect.objectContaining({
                format: 'json',
                disposition: 'inline',
            }),
        });
    });

    it('accepts XML workflows with root and item names', () => {
        const workflow = {
            workflow_id: 'wf-xml',
            label: 'XML export',
            strategy_type: ExportStrategy.HTTP_RESPONSE,
            mapping: '$',
            strategy: {
                format: 'xml',
                disposition: 'attachment',
                root_name: 'records',
                item_name: 'record',
            },
        } as any;

        expect(validateExportWorkflow(workflow)).toMatchObject({
            strategy: expect.objectContaining({
                format: 'xml',
                root_name: 'records',
                item_name: 'record',
            }),
        });
    });

    it('accepts CSV workflows with delimiter and quote character', () => {
        const workflow = {
            workflow_id: 'wf-csv',
            label: 'CSV export',
            strategy_type: ExportStrategy.HTTP_RESPONSE,
            mapping: '$',
            strategy: {
                format: 'csv',
                disposition: 'attachment',
                delimiter: ';',
                quote_char: '"',
            },
        } as any;

        expect(validateExportWorkflow(workflow)).toMatchObject({
            strategy: expect.objectContaining({
                format: 'csv',
                delimiter: ';',
                quote_char: '"',
            }),
        });
    });

    it('accepts XLSX workflows with sheet names', () => {
        const workflow = {
            workflow_id: 'wf-xlsx',
            label: 'XLSX export',
            strategy_type: ExportStrategy.HTTP_RESPONSE,
            mapping: '$',
            strategy: {
                format: 'xlsx',
                disposition: 'attachment',
                sheet_name: 'Export',
            },
        } as any;

        expect(validateExportWorkflow(workflow)).toMatchObject({
            strategy: expect.objectContaining({
                format: 'xlsx',
                sheet_name: 'Export',
            }),
        });
    });

    it('rejects XML workflows without item_name', () => {
        const workflow = {
            workflow_id: 'wf-xml',
            label: 'XML export',
            strategy_type: ExportStrategy.HTTP_RESPONSE,
            mapping: '$',
            strategy: {
                format: 'xml',
                disposition: 'inline',
                root_name: 'records',
            },
        } as any;

        try {
            validateExportWorkflow(workflow);
            fail('validateExportWorkflow should throw for incomplete XML strategy');
        } catch (error) {
            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).getResponse()).toMatchObject({
                statusCode: 400,
                code: ApiErrorCode.VALIDATION_FAILED,
                message: 'Validation failed',
                details: expect.arrayContaining([
                    expect.objectContaining({
                        path: 'strategy.item_name',
                    }),
                ]),
            });
        }
    });

    it('rejects CSV workflows without delimiter', () => {
        const workflow = {
            workflow_id: 'wf-csv',
            label: 'CSV export',
            strategy_type: ExportStrategy.HTTP_RESPONSE,
            mapping: '$',
            strategy: {
                format: 'csv',
                disposition: 'inline',
                quote_char: '"',
            },
        } as any;

        try {
            validateExportWorkflow(workflow);
            fail('validateExportWorkflow should throw for incomplete CSV strategy');
        } catch (error) {
            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).getResponse()).toMatchObject({
                statusCode: 400,
                code: ApiErrorCode.VALIDATION_FAILED,
                message: 'Validation failed',
                details: expect.arrayContaining([
                    expect.objectContaining({
                        path: 'strategy.delimiter',
                    }),
                ]),
            });
        }
    });

    it('strips format-incompatible legacy strategy fields before validation', () => {
        const workflow = {
            workflow_id: 'wf-json',
            label: 'JSON export',
            strategy_type: ExportStrategy.HTTP_RESPONSE,
            mapping: '$',
            strategy: {
                format: 'json',
                disposition: 'inline',
                delimiter: ';',
                quote_char: '"',
                root_name: 'records',
            },
        } as any;

        expect(validateExportWorkflow(workflow)).toMatchObject({
            strategy: {
                format: 'json',
                disposition: 'inline',
            },
        });
    });

    it('rejects unknown strategy fields that are not part of a legacy format switch', () => {
        const workflow = {
            workflow_id: 'wf-json',
            label: 'JSON export',
            strategy_type: ExportStrategy.HTTP_RESPONSE,
            mapping: '$',
            strategy: {
                format: 'json',
                disposition: 'inline',
                totally_unknown: 'value',
            },
        } as any;

        try {
            validateExportWorkflow(workflow);
            fail('validateExportWorkflow should throw for unknown fields');
        } catch (error) {
            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).getResponse()).toMatchObject({
                statusCode: 400,
                code: ApiErrorCode.VALIDATION_FAILED,
                message: 'Validation failed',
                details: expect.arrayContaining([
                    expect.objectContaining({
                        path: 'strategy',
                        code: 'unrecognized_keys',
                    }),
                ]),
            });
        }
    });

    it('rejects blank XML names after trimming', () => {
        const workflow = {
            workflow_id: 'wf-xml',
            label: 'XML export',
            strategy_type: ExportStrategy.HTTP_RESPONSE,
            mapping: '$',
            strategy: {
                format: 'xml',
                disposition: 'inline',
                root_name: '   ',
                item_name: 'record',
            },
        } as any;

        try {
            validateExportWorkflow(workflow);
            fail('validateExportWorkflow should throw for blank XML names');
        } catch (error) {
            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).getResponse()).toMatchObject({
                statusCode: 400,
                code: ApiErrorCode.VALIDATION_FAILED,
                message: 'Validation failed',
                details: expect.arrayContaining([
                    expect.objectContaining({
                        path: 'strategy.root_name',
                    }),
                ]),
            });
        }
    });

    it('rejects inline xlsx exports', () => {
        const workflow = {
            workflow_id: 'wf-xlsx',
            label: 'XLSX export',
            strategy_type: ExportStrategy.HTTP_RESPONSE,
            mapping: '$',
            strategy: {
                format: 'xlsx',
                disposition: 'inline',
                sheet_name: 'Export',
            },
        } as any;

        try {
            validateExportWorkflow(workflow);
            fail('validateExportWorkflow should throw for inline XLSX strategy');
        } catch (error) {
            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).getResponse()).toMatchObject({
                statusCode: 400,
                code: ApiErrorCode.VALIDATION_FAILED,
                message: 'Validation failed',
                details: expect.arrayContaining([
                    expect.objectContaining({
                        path: 'strategy.disposition',
                        message: 'disposition must be attachment when format is xlsx',
                    }),
                ]),
            });
        }
    });
});
