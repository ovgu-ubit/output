import { SetMetadata } from '@nestjs/common';

export interface PermissionDecoration {
    role: string | null;
    app: string;
}

export const Permissions = (permissions: PermissionDecoration[]) => SetMetadata('permissions', permissions);
