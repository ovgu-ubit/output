import type { FactoryProvider } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import path from 'node:path';
import { AuthorizationModule } from '../src/authorization/authorization.module';
import { AUTH_SERVICE } from '../src/authorization/authorization.service';
import { AppConfigService } from '../src/config/app-config.service';
import { DemoAuthService } from '../src/demo-auth/demo-auth.service';

describe('Dynamic CommonJS authorization provider', () => {
    const provider = AuthorizationModule.forRootAsync().providers!.find(provider =>
        typeof provider === 'object' && 'provide' in provider && provider.provide === AUTH_SERVICE,
    ) as FactoryProvider;
    const reflector = {};
    const jwt = {};
    const http = {};
    const demoAuth = {};
    const createProvider = (exported: string, file = path.join(__dirname, 'fixtures/auth-provider.cjs')) => {
        const configuration = { get: async (key: string) => key === 'AUTH_SERVICE_PATH' ? file : exported };
        return provider.useFactory!(configuration, reflector, jwt, http, demoAuth);
    };

    it('loads a named CommonJS export and supplies its framework dependencies', async () => {
        const service = await createProvider('CustomAuthorizationService');
        expect(service.constructor.name).toBe('CustomAuthorizationService');
        expect(service.dependencies).toEqual([reflector, expect.objectContaining({ get: expect.any(Function) }), jwt, http, demoAuth]);
        await expect(service.verify()).resolves.toBe(true);
        expect(provider.inject).toEqual([AppConfigService, Reflector, JwtService, HttpService, DemoAuthService]);
    });

    it('rejects a provider without the authorization contract', async () => {
        await expect(createProvider('InvalidAuthorizationService')).rejects.toThrow('verify');
    });

    it('reports a missing export', async () => {
        await expect(createProvider('MissingExport')).rejects.toThrow('MissingExport');
    });

    it('reports a missing provider file', async () => {
        await expect(createProvider('CustomAuthorizationService', path.join(__dirname, 'fixtures/missing.cjs'))).rejects.toThrow('AUTH_SERVICE_PATH not found');
    });
});
