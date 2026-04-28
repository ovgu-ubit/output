import { HttpException } from '@nestjs/common';
import { ApiErrorCode } from '../../../../output-interfaces/ApiError';
import { StatusService } from './status.service';

describe('StatusService', () => {
    let service: StatusService;
    let repository: {
        findOne: jest.Mock;
        save: jest.Mock;
    };

    beforeEach(() => {
        repository = {
            findOne: jest.fn(),
            save: jest.fn(),
        };
        service = new StatusService(repository as never, {} as never);
    });

    it('creates a status with a provided id', async () => {
        const status = { id: 3, label: 'Published' };
        repository.findOne.mockResolvedValue(null);
        repository.save.mockResolvedValue(status);

        await expect(service.create(status)).resolves.toEqual(status);

        expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 3 } });
        expect(repository.save).toHaveBeenCalledWith(status);
    });

    it('rejects status create requests without an id', async () => {
        try {
            await service.create({ label: 'Published' });
            fail('service.create should reject missing status ids');
        } catch (error) {
            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).getResponse()).toMatchObject({
                statusCode: 400,
                code: ApiErrorCode.INVALID_REQUEST,
                details: expect.arrayContaining([
                    expect.objectContaining({ path: 'id', code: 'required_id' }),
                ]),
            });
        }
        expect(repository.save).not.toHaveBeenCalled();
    });

    it('rejects status create requests for an existing id', async () => {
        repository.findOne.mockResolvedValue({ id: 3, label: 'Existing' });

        try {
            await service.create({ id: 3, label: 'Published' });
            fail('service.create should reject duplicate status ids');
        } catch (error) {
            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).getResponse()).toMatchObject({
                statusCode: 409,
                code: ApiErrorCode.UNIQUE_CONSTRAINT,
            });
        }
        expect(repository.save).not.toHaveBeenCalled();
    });
});
