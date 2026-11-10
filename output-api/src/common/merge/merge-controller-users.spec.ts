import { AuthorController } from '../../author/AuthorController';
import { InstituteController } from '../../institute/InstituteController';
import { FunderController } from '../../funder/FunderController';
import { PublisherController } from '../../publisher/PublisherController';
import { PublicationTypeController } from '../../pub_type/PublicationTypeController';
import { OACategoryController } from '../../oa_category/OACategoryController';
import { GreaterEntityController } from '../../greater_entity/GreaterEntityController';
import { ContractController } from '../../contract/ContractController';

describe('Authenticated users in master-data merges', () => {
    const aliases = ['Alias'];
    it.each([
        { Controller: AuthorController, method: 'combineAuthors', args: [1, [2], aliases, aliases], expected: [1, [2], aliases, aliases, 'alice'] },
        { Controller: InstituteController, method: 'combine', args: [1, [2], aliases], expected: [1, [2], aliases, 'alice'] },
        { Controller: FunderController, method: 'combine', args: [1, [2], aliases], expected: [1, [2], aliases, 'alice'] },
        { Controller: PublisherController, method: 'combine', args: [1, [2], aliases], expected: [1, [2], aliases, 'alice'] },
        { Controller: PublicationTypeController, method: 'combine', args: [1, [2], aliases], expected: [1, [2], aliases, 'alice'] },
        { Controller: OACategoryController, method: 'combine', args: [1, [2]], expected: [1, [2], 'alice'] },
        { Controller: GreaterEntityController, method: 'combine', args: [1, [2]], expected: [1, [2], 'alice'] },
        { Controller: ContractController, method: 'combine', args: [1, [2]], expected: [1, [2], undefined, 'alice'] },
    ])('forwards the request user in $Controller.name', async ({ Controller, method, args, expected }) => {
        const service = { [method]: jest.fn().mockResolvedValue({ id: 1 }) };
        const controller = Object.assign(Object.create(Controller.prototype), { service, instService: service });
        await expect(controller.combine(...args, { user: { username: 'alice' } })).resolves.toEqual({ id: 1 });
        expect(service[method]).toHaveBeenCalledWith(...expected);
    });
});
