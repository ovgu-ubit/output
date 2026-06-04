import { HttpException } from '@nestjs/common';

import {  ApiErrorCode  } from '@output/interfaces';
import { createNotFoundHttpException } from '../common/api-error';
import { ContractController } from './ContractController';

describe('ContractController', () => {
    let controller: ContractController;
    let service: {
        index: jest.Mock;
        getComponents: jest.Mock;
        oneComponentOrFail: jest.Mock;
        combine: jest.Mock;
        one: jest.Mock;
        get: jest.Mock;
        save: jest.Mock;
        update: jest.Mock;
        delete: jest.Mock;
        normalizeForCreate: jest.Mock;
    };

    beforeEach(() => {
        service = {
            index: jest.fn(),
            getComponents: jest.fn(),
            oneComponentOrFail: jest.fn(),
            combine: jest.fn(),
            one: jest.fn(),
            get: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            normalizeForCreate: jest.fn((body) => body),
        };

        controller = new ContractController(service as any);
    });

    it('loads one contract component through the service', async () => {
        service.oneComponentOrFail.mockResolvedValue({ id: 7, label: 'Main component' });

        const result = await controller.oneComponent(7, { user: { read: true } } as any);

        expect(service.oneComponentOrFail).toHaveBeenCalledWith(7, true);
        expect(result).toEqual({ id: 7, label: 'Main component' });
    });

    it('omits invoice access when loading public contract components', async () => {
        service.getComponents.mockResolvedValue([{ id: 7, label: 'Main component' }]);

        const result = await controller.components(3, { user: { read: false } } as any);

        expect(service.getComponents).toHaveBeenCalledWith(3, false);
        expect(result).toEqual([{ id: 7, label: 'Main component' }]);
    });

    it('forwards read access when loading a contract', async () => {
        service.one.mockResolvedValue({ id: 1, label: 'Contract' });

        const result = await controller.one(1, { user: { read: true, write: false, username: 'reader' } } as any);

        expect(service.one).toHaveBeenCalledWith(1, false, 'reader', true);
        expect(result).toEqual({ id: 1, label: 'Contract' });
    });

    it('forwards read access when loading the contract index', async () => {
        service.index.mockResolvedValue([{ id: 1, label: 'Contract', net_costs: 100 }]);

        const result = await controller.index(2025, { user: { read: true } } as any);

        expect(service.index).toHaveBeenCalledWith(2025, true);
        expect(result).toEqual([{ id: 1, label: 'Contract', net_costs: 100 }]);
    });

    it('throws a structured not-found error when one contract component is missing', async () => {
        service.oneComponentOrFail.mockRejectedValue(createNotFoundHttpException('Contract component not found.'));

        try {
            await controller.oneComponent(7, { user: { read: true } } as any);
            fail('controller.oneComponent should reject missing components');
        } catch (error) {
            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).getResponse()).toMatchObject({
                statusCode: 404,
                code: ApiErrorCode.NOT_FOUND,
            });
        }
    });
});
