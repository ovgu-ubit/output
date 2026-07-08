import { InstituteController } from './InstituteController';

describe('InstituteController', () => {
    let controller: InstituteController;
    let instituteService: { index: jest.Mock };

    beforeEach(() => {
        instituteService = {
            index: jest.fn(),
        };

        controller = new InstituteController(instituteService as any);
    });

    it('forwards read access when loading the institute index', async () => {
        instituteService.index.mockResolvedValue([{ id: 1, label: 'Institute', net_costs: 75 }]);

        const result = await controller.index(2025, { user: { read: true } } as any);

        expect(instituteService.index).toHaveBeenCalledWith(2025, true);
        expect(result).toEqual([{ id: 1, label: 'Institute', net_costs: 75 }]);
    });
});
