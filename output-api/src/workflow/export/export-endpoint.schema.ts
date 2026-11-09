import { CompareOperation, ExportEndpointRequest, JoinOperation } from '@output/interfaces';
import { z } from 'zod';
import { createValidationHttpException } from '../../common/api-error';

const FilterExpressionSchema = z.object({
    op: z.enum(JoinOperation),
    key: z.string().min(1),
    comp: z.enum(CompareOperation),
    value: z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(z.union([z.string(), z.number(), z.boolean()]))]),
}).strict();

const EndpointRequestSchema = z.object({
    filter: z.object({ expressions: z.array(FilterExpressionSchema) }).strict().default({ expressions: [] }),
    paths: z.array(z.string().min(1)).default([]),
}).strict();

export function parseExportEndpointRequest(body: unknown): Required<ExportEndpointRequest> {
    const result = EndpointRequestSchema.safeParse(body === undefined ? {} : body);
    if (!result.success) {
        throw createValidationHttpException(result.error.issues.map(issue => ({
            path: issue.path.join('.'), code: issue.code, message: issue.message,
        })));
    }
    return result.data as Required<ExportEndpointRequest>;
}
