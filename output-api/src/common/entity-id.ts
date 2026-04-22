import { createInvalidRequestHttpException } from './api-error';

export function hasProvidedEntityId(id: unknown): boolean {
    return id !== undefined && id !== null && id !== '';
}

export function assertCreateRequestHasNoId(entity: { id?: unknown } | null | undefined): void {
    if (hasProvidedEntityId(entity?.id)) {
        throw createInvalidRequestHttpException('id must not be provided for create requests', [
            {
                path: 'id',
                code: 'forbidden_id',
                message: 'id must not be provided for create requests',
            },
        ]);
    }
}
