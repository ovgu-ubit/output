import { EntityAccessRight } from '../common/abstract-entity.service';
import { AuthorController } from './AuthorController';

describe('AuthorController', () => {
    let controller: AuthorController;
    let authorService: { index: jest.Mock; oneOrFail: jest.Mock; combineAuthors: jest.Mock };

    beforeEach(() => {
        authorService = {
            index: jest.fn(),
            oneOrFail: jest.fn(),
            combineAuthors: jest.fn(),
        };

        controller = new AuthorController(authorService as any);
    });

    it('forwards reader access when loading an author', async () => {
        const author = { id: 7, first_name: 'Ada', last_name: 'Lovelace', internal_remark: 'internal' };
        authorService.oneOrFail.mockResolvedValue(author);

        await expect(controller.one(7, { user: { read: true, write: true, username: 'alice' } } as any))
            .resolves.toBe(author);

        expect(authorService.oneOrFail).toHaveBeenCalledWith(
            7,
            {
                username: 'alice',
                rights: {
                    [EntityAccessRight.Read]: true,
                    [EntityAccessRight.Write]: true,
                },
            },
            'Author not found.',
        );
    });

    it('forwards read access when loading the author index', async () => {
        authorService.index.mockResolvedValue([{ id: 1, first_name: 'Ada', last_name: 'Lovelace', net_costs: 50 }]);

        const result = await controller.index(2025, { user: { read: true } } as any);

        expect(authorService.index).toHaveBeenCalledWith(2025, true);
        expect(result).toEqual([{ id: 1, first_name: 'Ada', last_name: 'Lovelace', net_costs: 50 }]);
    });
});
