import { BadRequestException } from '@nestjs/common';

export function hasProvidedEntityId(id: unknown): boolean {
    return id !== undefined && id !== null && id !== '';
}

export function assertCreateRequestHasNoId(entity: { id?: unknown } | null | undefined): void {
    if (hasProvidedEntityId(entity?.id)) {
        throw new BadRequestException('id must not be provided for create requests');
    }
}
