import { LoginGuard } from '../security/login.guard';
import { INVOICE_ROUTES } from './invoices.module';

describe('Invoice route permissions', () => {
  for (const role of ['reader', 'writer', 'admin', 'publication_writer']) {
    it(`checks financial access for ${role}`, () => {
      const guard = new LoginGuard({
        isValid: () => true, hasRole: required => role === required,
      } as never, { getValue: () => true } as never);
      expect(INVOICE_ROUTES[0].canActivate).toContain(LoginGuard);
      expect(guard.check(INVOICE_ROUTES[0].data['roles'], {})).toBe(role !== 'publication_writer');
    });
  }
});
