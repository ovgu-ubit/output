import { hasApplicationRole } from '@output/interfaces';

describe('Shared application role checks', () => {
    it('inherits reader access for output publication writers only', () => {
        const permissions = [{ appname: 'output', rolename: 'publication_writer' }];
        expect(hasApplicationRole(permissions, 'output', 'reader')).toBe(true);
        expect(hasApplicationRole(permissions, 'output', 'publication_writer')).toBe(true);
        expect(hasApplicationRole(permissions, 'output', 'writer')).toBe(false);
        expect(hasApplicationRole(permissions, 'output', 'admin')).toBe(false);
        expect(hasApplicationRole(permissions, 'other', 'reader')).toBe(false);
        expect(hasApplicationRole([{ appname: 'other', rolename: 'publication_writer' }], 'other', 'reader')).toBe(false);
    });

    it('does not grant publication write access to readers', () => {
        expect(hasApplicationRole([{ appname: 'output', rolename: 'reader' }], 'output', 'publication_writer')).toBe(false);
    });

    it('preserves global admin access and application-level wildcard checks', () => {
        expect(hasApplicationRole([{ appname: null, rolename: 'admin' }], 'output', 'writer')).toBe(true);
        expect(hasApplicationRole([{ appname: 'output', rolename: 'publication_writer' }], 'output', null)).toBe(true);
        expect(hasApplicationRole([{ appname: 'other', rolename: 'reader' }], 'output', null)).toBe(false);
    });

    it('denies empty permissions and roles from other applications', () => {
        expect(hasApplicationRole(null, 'output', 'reader')).toBe(false);
        expect(hasApplicationRole(undefined, 'output', 'reader')).toBe(false);
        expect(hasApplicationRole([], 'output', 'reader')).toBe(false);
        expect(hasApplicationRole([{ appname: 'other', rolename: 'reader' }], 'output', 'reader')).toBe(false);
    });
});
