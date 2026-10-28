import { LoginGuard } from '../security/login.guard';
import { CookieTokenService } from '../security/cookie.token.service';
import { INVOICE_ROUTES } from './invoices.module';

describe('Invoice route permissions', () => {
    for (const role of ['reader', 'writer', 'admin', 'publication_writer', 'anonymous']) {
        it(`checks financial access for ${role}`, () => {
            const config = { getValue: () => true } as never;
            const tokenService = new CookieTokenService({
                check: () => role !== 'anonymous',
                get: () => JSON.stringify({ id: 'test', permissions: [{ appname: 'output', rolename: role }] }),
            } as never, null!, config, null!, null!, null!);
            vi.spyOn(tokenService, 'login').mockReturnValue(undefined);
            const guard = new LoginGuard(tokenService, config);
            expect(INVOICE_ROUTES[0].canActivate).toContain(LoginGuard);
            expect(guard.check(INVOICE_ROUTES[0].data['roles'], {})).toBe(role !== 'anonymous');
        });
    }
});
