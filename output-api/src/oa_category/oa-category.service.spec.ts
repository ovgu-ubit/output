import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { OACategoryService } from './oa-category.service';
import { OA_Category } from './OA_Category.entity';
import { PublicationService } from '../publication/core/publication.service';
import { AppConfigService } from '../config/app-config.service';
describe('OACategoryService', () => {
    let service: OACategoryService;
    let repository: jest.Mocked<Partial<Repository<OA_Category>>>;
    let publicationService: { save: jest.Mock };

    beforeEach(async () => {
        repository = {
            findOne: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
        };
        publicationService = {
            save: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OACategoryService,
                { provide: getRepositoryToken(OA_Category), useValue: repository },
                { provide: PublicationService, useValue: publicationService },
                { provide: AppConfigService, useValue: { get: jest.fn() } },
            ],
        }).compile();

        service = module.get(OACategoryService);
    });

    it('combines duplicate OA categories by preserving the primary label and enriching missing metadata', async () => {
        const primary: OA_Category = {
            id: 10,
            label: 'Primary Label',
            description: null,
            is_oa: true,
            publications: [{ id: 1 }] as any,
        } as OA_Category;
        const duplicateA: OA_Category = {
            id: 20,
            label: 'Duplicate A',
            description: 'Description from duplicate',
            is_oa: false,
            publications: [{ id: 2, oa_category: { id: 20 } }] as any,
        } as OA_Category;
        const duplicateB: OA_Category = {
            id: 30,
            label: 'Duplicate B',
            description: null,
            is_oa: true,
            publications: [{ id: 3, oa_category: { id: 30 } }] as any,
        } as OA_Category;

        const byId = new Map<number, OA_Category>([
            [primary.id, primary],
            [duplicateA.id, duplicateA],
            [duplicateB.id, duplicateB],
        ]);

        repository.findOne.mockImplementation(async ({ where }: any) => byId.get(where.id));
        repository.save.mockImplementation(async entity => entity as OA_Category);
        publicationService.save.mockResolvedValue(undefined);
        repository.delete!.mockResolvedValue(undefined as never);

        const combined = await service.combine(10, [20, 30]);

        expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
            id: 10,
            label: 'Primary Label',
            description: 'Description from duplicate',
            is_oa: true,
        }));
        expect(combined).toEqual(expect.objectContaining({
            id: 10,
            description: 'Description from duplicate',
        }));
        expect(publicationService.save).toHaveBeenCalledTimes(2);
        expect(publicationService.save).toHaveBeenCalledWith([
            expect.objectContaining({ id: 2, oa_category: expect.objectContaining({ id: 10 }) }),
        ]);
        expect(publicationService.save).toHaveBeenCalledWith([
            expect.objectContaining({ id: 3, oa_category: expect.objectContaining({ id: 10 }) }),
        ]);
        expect(repository.delete).toHaveBeenCalledWith([20, 30]);
    });
});
