import { HttpException } from '@nestjs/common';

import { ApiErrorCode } from '../../../output-interfaces/ApiError';
import { ContractController } from './ContractController';

describe('ContractController', () => {
    let controller: ContractController;
    let service: {
        index: jest.Mock;
        getComponents: jest.Mock;
        oneComponent: jest.Mock;
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
            oneComponent: jest.fn(),
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
        service.oneComponent.mockResolvedValue({ id: 7, label: 'Main component' });

        const result = await controller.oneComponent(7);

        expect(service.oneComponent).toHaveBeenCalledWith(7);
        expect(result).toEqual({ id: 7, label: 'Main component' });
    });

    it('throws a structured not-found error when one contract component is missing', async () => {
        service.oneComponent.mockResolvedValue(null);

        try {
            await controller.oneComponent(7);
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
