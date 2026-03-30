import { InvoiceController } from './InvoiceController';

describe('InvoiceController', () => {
    let controller: InvoiceController;
    let invoiceService: { getForPub: jest.Mock; get: jest.Mock; save: jest.Mock; delete: jest.Mock };
    let costTypeService: { get: jest.Mock; getCostTypeIndex: jest.Mock; one: jest.Mock; save: jest.Mock; update: jest.Mock; delete: jest.Mock };
    let costCenterService: { get: jest.Mock; getCostCenterIndex: jest.Mock; one: jest.Mock; save: jest.Mock; update: jest.Mock; delete: jest.Mock };

    beforeEach(() => {
        invoiceService = {
            getForPub: jest.fn(),
            get: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
        };
        costTypeService = {
            get: jest.fn(),
            getCostTypeIndex: jest.fn(),
            one: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };
        costCenterService = {
            get: jest.fn(),
            getCostCenterIndex: jest.fn(),
            one: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };

        controller = new InvoiceController(invoiceService as any, costTypeService as any, costCenterService as any);
    });

    it('loads cost types through CostTypeService', async () => {
        costTypeService.get.mockResolvedValue([{ id: 1, label: 'APC' }]);

        const result = await controller.cost_type();

        expect(costTypeService.get).toHaveBeenCalled();
        expect(result).toEqual([{ id: 1, label: 'APC' }]);
    });

    it('forwards writer flag and username when loading one cost type', async () => {
        await controller.cost_type_one(7, { user: { write: true, username: 'alice' } } as any);

        expect(costTypeService.one).toHaveBeenCalledWith(7, true, 'alice');
    });

    it('forwards username when updating a cost type', async () => {
        const body = { id: 8, label: 'Updated' };

        await controller.updateCT(body as any, { user: { username: 'alice' } } as any);

        expect(costTypeService.update).toHaveBeenCalledWith(body, 'alice');
    });

    it('forwards writer flag and username when loading one cost center', async () => {
        await controller.cost_center_one(9, { user: { write: true, username: 'alice' } } as any);

        expect(costCenterService.one).toHaveBeenCalledWith(9, true, 'alice');
    });

    it('forwards username when updating a cost center', async () => {
        const body = { id: 10, label: 'Updated' };

        await controller.updateCC(body as any, { user: { username: 'alice' } } as any);

        expect(costCenterService.update).toHaveBeenCalledWith(body, 'alice');
    });
});
