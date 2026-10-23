import { HttpService } from '@nestjs/axios';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { of } from 'rxjs';
import { AccessGuard } from '../authorization/access.guard';
import { TokenAuthorizationService } from '../authorization/token.authorization.service';
import { AppConfigService } from '../config/app-config.service';
import { InvoiceIndexController } from './InvoiceIndexController';
import { InvoiceIndexQueryDto } from './dto/invoice-index-query.dto';

describe('InvoiceIndexController', () => {
    it('forwards the query to the dedicated read service', async () => {
        const page = { items: [], total: 0, page: 0, page_size: 50 };
        const service = { index: jest.fn().mockResolvedValue(page) };
        const controller = new InvoiceIndexController(service as never);
        const query = Object.assign(new InvoiceIndexQueryDto(), { contract_id: 2 });
        await expect(controller.index(query)).resolves.toBe(page);
        expect(service.index).toHaveBeenCalledWith(query);
    });

    it.each([
        ['reader', true], ['writer', true], ['admin', true], ['publication_writer', false], ['anonymous', false],
    ])('enforces the endpoint permissions for %s', async (role, allowed) => {
        const config = { get: jest.fn(async (key: string) => key === 'AUTH' ? 'true' : 'http://auth/') };
        const jwt = { verify: jest.fn(() => ({ id: 'test', permissions: [{ appname: 'output', rolename: role }] })) };
        const http = { get: jest.fn(() => of({ data: 'test-public-key' })) };
        const authorization = new TokenAuthorizationService(new Reflector(), config as unknown as AppConfigService, jwt as unknown as JwtService, http as unknown as HttpService);
        const request = { cookies: role === 'anonymous' ? {} : { 'auth-token': 'token' } };
        const context = {
            switchToHttp: () => ({ getRequest: () => request }),
            getHandler: () => InvoiceIndexController.prototype.index,
        } as unknown as ExecutionContext;
        await expect(new AccessGuard(authorization).canActivate(context)).resolves.toBe(allowed);
    });
});
