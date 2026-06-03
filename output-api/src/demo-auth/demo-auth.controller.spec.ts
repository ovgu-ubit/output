import { NotFoundException } from '@nestjs/common';
import { DemoAuthController } from './demo-auth.controller';
import { DemoAuthService } from './demo-auth.service';

describe('DemoAuthController', () => {
  let service: jest.Mocked<Partial<DemoAuthService>>;
  let controller: DemoAuthController;
  let response: any;

  beforeEach(() => {
    service = {
      login: jest.fn(),
      assertDemoMode: jest.fn(),
      getPublicKey: jest.fn(),
      isSecureCookie: jest.fn(),
      getTokenMaxAgeMs: jest.fn(),
    };
    controller = new DemoAuthController(service as unknown as DemoAuthService);
    response = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };
  });

  it('sets auth-token and auth-details cookies on login', async () => {
    const details = {
      id: 'demo',
      permissions: [{ appname: 'output', rolename: 'admin' }],
    };
    service.login.mockResolvedValue({ token: 'jwt-token', details });
    service.isSecureCookie.mockResolvedValue(false);
    service.getTokenMaxAgeMs.mockReturnValue(28800000);

    await expect(controller.login({ username: 'demo', password: 'secret' }, response)).resolves.toEqual(details);

    expect(response.cookie).toHaveBeenCalledWith('auth-token', 'jwt-token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: 28800000,
    });
    expect(response.cookie).toHaveBeenCalledWith('auth-details', JSON.stringify(details), {
      httpOnly: false,
      sameSite: 'lax',
      secure: false,
      path: '/',
      maxAge: 28800000,
    });
  });

  it('returns the public key when demo mode is enabled', async () => {
    service.getPublicKey.mockReturnValue('public-key');

    await expect(controller.publicKey()).resolves.toBe('public-key');
    expect(service.assertDemoMode).toHaveBeenCalled();
  });

  it('clears demo cookies on logout', async () => {
    service.isSecureCookie.mockResolvedValue(false);

    await expect(controller.logoutPost(response)).resolves.toEqual({ success: true });

    expect(response.clearCookie).toHaveBeenCalledWith('auth-token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
    });
    expect(response.clearCookie).toHaveBeenCalledWith('auth-details', {
      httpOnly: false,
      sameSite: 'lax',
      secure: false,
      path: '/',
    });
  });

  it('returns 404 behavior when demo mode is disabled', async () => {
    service.assertDemoMode.mockRejectedValue(new NotFoundException());

    await expect(controller.publicKey()).rejects.toBeInstanceOf(NotFoundException);
  });
});
