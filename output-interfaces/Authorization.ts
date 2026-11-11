export interface ApplicationPermission {
    appname: string | null;
    rolename: string;
}

/** Output publication writers inherit reader access, but not general writer or admin access. */
export function hasApplicationRole(
    permissions: readonly ApplicationPermission[] | null | undefined, application: string, role: string | null,
): boolean {
    return permissions?.some(permission =>
        (permission.appname === null && permission.rolename === 'admin')
        || (permission.appname === application && (
            role === null || permission.rolename === role
            || (application === 'output' && role === 'reader' && permission.rolename === 'publication_writer')
        )),
    ) ?? false;
}
