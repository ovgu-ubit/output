import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppConfigService } from '../config/app-config.service';
import { DemoAuthService } from './demo-auth.service';

describe('DemoAuthService', () => {
  let configService: { get: jest.Mock };
  let service: DemoAuthService;

  beforeEach(() => {
    configService = {
      get: jest.fn(async (key: string) => {
        if (key === 'DEMO_MODE') return true;
        if (key === 'DEMO_USER') return 'demo';
        if (key === 'DEMO_PW') return 'secret';
        if (key === 'APP_SSL') return 'false';
        return undefined;
      }),
    };
    service = new DemoAuthService(configService as unknown as AppConfigService, new JwtService());
  });

  it('creates a signed admin token for valid demo credentials', async () => {
    const result = await service.login('demo', 'secret');

    const payload = new JwtService().verify(result.token, {
      publicKey: service.getPublicKey(),
      algorithms: ['RS256'],
    });
    expect(payload).toMatchObject({
      id: 'demo',
      permissions: [{ appname: 'output', rolename: 'admin' }],
    });
    expect(result.details).toEqual({
      id: 'demo',
      permissions: [{ appname: 'output', rolename: 'admin' }],
    });
  });

  it('rejects invalid demo credentials', async () => {
    await expect(service.login('demo', 'wrong')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('detects secure cookies from APP_SSL', async () => {
    configService.get.mockImplementation(async (key: string) => {
      if (key === 'APP_SSL') return 'true';
      if (key === 'DEMO_MODE') return true;
      return undefined;
    });

    await expect(service.isSecureCookie()).resolves.toBe(true);
  });
});
