import { applyDecorators } from '@nestjs/common';
import { ApiAcceptedResponse, ApiBadRequestResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation } from '@nestjs/swagger';

export function ApiImportStop() {
    return applyDecorators(
        ApiOperation({ summary: 'Request cooperative cancellation of the current import/enrich run' }),
        ApiAcceptedResponse({ description: 'Cancellation requested; running records are still draining.', schema: {
            type: 'object', required: ['state', 'runId'], properties: {
                state: { type: 'string', enum: ['stopping'] }, runId: { type: 'string', format: 'uuid' },
            },
        } }),
        ApiOkResponse({ description: 'No active run, or an orphaned workflow report was marked interrupted.', schema: {
            type: 'object', required: ['state'], properties: {
                state: { type: 'string', enum: ['not-running', 'interrupted'] }, reportId: { type: 'integer' },
            },
        } }),
        ApiBadRequestResponse({ description: 'Invalid parameters.' }),
        ApiNotFoundResponse({ description: 'Unknown workflow or service.' }),
    );
}
