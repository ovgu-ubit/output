import { ApplicationPermission, hasApplicationRole } from '@output/interfaces';

interface InvoiceUser {
    read?: boolean;
    write?: boolean;
    admin?: boolean;
    permissions?: ApplicationPermission[];
}

/** Invoice access follows general reader access, including publication_writer. */
export function canReadInvoices(user?: InvoiceUser): boolean {
    return user?.read === true || user?.write === true || user?.admin === true
        || ['reader', 'writer', 'admin'].some(role => hasApplicationRole(user?.permissions, 'output', role));
}
