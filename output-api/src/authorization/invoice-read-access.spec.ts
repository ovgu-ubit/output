import { canReadInvoices } from './invoice-read-access';

describe('canReadInvoices', () => {
    it.each(['reader', 'writer', 'admin', 'publication_writer'])('allows the output %s role', rolename => {
        expect(canReadInvoices({ permissions: [{ appname: 'output', rolename }] })).toBe(true);
    });

    it('allows global admins and requests with authentication disabled', () => {
        expect(canReadInvoices({ permissions: [{ appname: null, rolename: 'admin' }] })).toBe(true);
        expect(canReadInvoices({ write: true, admin: true })).toBe(true);
    });

    it('honors the reader flag derived by the authorization service', () => {
        expect(canReadInvoices({ read: true })).toBe(true);
        expect(canReadInvoices({ read: false })).toBe(false);
    });

    it('denies anonymous users and roles from other apps', () => {
        expect(canReadInvoices()).toBe(false);
        expect(canReadInvoices({ permissions: [{ appname: 'other', rolename: 'reader' }] })).toBe(false);
        expect(canReadInvoices({})).toBe(false);
    });
});
