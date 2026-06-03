import { StatusController } from './StatusController';

describe('StatusController', () => {
    let controller: StatusController;
    let service: {
        normalizeForCreate: jest.Mock;
        create: jest.Mock;
    };

    beforeEach(() => {
        service = {
            normalizeForCreate: jest.fn((body) => body),
            create: jest.fn(),
        };
        controller = new StatusController(service as never);
    });

    it('allows a status id in create requests', async () => {
        const status = { id: 3, label: 'Published', description: '' };
        service.create.mockResolvedValue(status);

        await expect(controller.save(status)).resolves.toEqual(status);

        expect(service.normalizeForCreate).toHaveBeenCalledWith(status);
        expect(service.create).toHaveBeenCalledWith(status);
    });
});
