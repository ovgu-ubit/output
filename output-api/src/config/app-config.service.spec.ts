import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppConfigService } from './app-config.service';
import { Config } from './Config.entity';


describe('AppConfigService', () => {
    let service: AppConfigService;
    let repository: jest.Mocked<Partial<Repository<Config>>>;
    let configService: { get: jest.Mock };
    let dataSource: { isInitialized: boolean; initialize: jest.Mock; query: jest.Mock };

    beforeEach(async () => {
        repository = {
            find: jest.fn(),
            findOneBy: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
        };
        configService = { get: jest.fn() };
        dataSource = {
            isInitialized: false,
            initialize: jest.fn(),
            query: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AppConfigService,
                { provide: getRepositoryToken(Config), useValue: repository },
                { provide: ConfigService, useValue: configService },
                { provide: DataSource, useValue: dataSource },
            ],
        }).compile();

        service = module.get<AppConfigService>(AppConfigService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('returns docker paths for config and log directories when docker mode is enabled', async () => {
        configService.get.mockImplementation((key: string) => {
            if (key === 'APP_DOCKER_MODE') return 'true';
            return undefined;
        });

        await expect(service.get('APP_CONFIG_PATH')).resolves.toBe('./config/');
        await expect(service.get('APP_LOG_PATH')).resolves.toBe('./log/');
        expect(configService.get).toHaveBeenCalledWith('APP_DOCKER_MODE');
    });

    it('returns config service values before falling back to the database', async () => {
        configService.get.mockReturnValueOnce('from-config');

        await expect(service.get('SOME_KEY')).resolves.toBe('from-config');
        expect(repository.find).not.toHaveBeenCalled();
    });

    it('returns database value or reporting year default when config service does not provide a value', async () => {
        const currentYear = new Date().getFullYear();
        repository.find.mockResolvedValueOnce([]);
        repository.find.mockResolvedValueOnce([{ value: 'db-value' }] as any);

        await expect(service.get('reporting_year')).resolves.toBe(currentYear);
        await expect(service.get('another_key')).resolves.toBe('db-value');
        expect(repository.find).toHaveBeenNthCalledWith(1, { where: { key: 'reporting_year' } });
        expect(repository.find).toHaveBeenNthCalledWith(2, { where: { key: 'another_key' } });
    });

    it('lists database config with ordering or by specific key', async () => {
        repository.find.mockResolvedValueOnce([{ key: 'a' }] as any);
        repository.findOneBy.mockResolvedValueOnce({ key: 'b' } as any);

        await expect(service.listDatabaseConfig()).resolves.toEqual([{ key: 'a' }]);
        await expect(service.listDatabaseConfig('b')).resolves.toEqual({ key: 'b' });
        expect(repository.find).toHaveBeenCalledWith({ order: { key: 'ASC' } });
        expect(repository.findOneBy).toHaveBeenCalledWith({ key: 'b' });
    });

    it('handles database config creation and updates', async () => {
        repository.findOneBy.mockResolvedValueOnce(null);
        repository.save.mockResolvedValueOnce({ key: 'x', value: 1 } as any);
        repository.findOneBy.mockResolvedValueOnce({ key: 'y', value: 2 } as any);
        repository.save.mockResolvedValueOnce({ key: 'y', value: 3 } as any);

        await expect(service.setDatabaseConfig('', 'ignored')).resolves.toBeNull();
        await expect(service.setDatabaseConfig('x', 1)).resolves.toEqual({ key: 'x', value: 1 });
        await expect(service.setDatabaseConfig('y', 3)).resolves.toEqual({ key: 'y', value: 3 });

        expect(repository.save).toHaveBeenNthCalledWith(1, { key: 'x', value: 1 });
        expect(repository.save).toHaveBeenNthCalledWith(2, { key: 'y', value: 3 });
    });

    it('reconciles defaults by saving missing entries, updating descriptions, and deleting obsolete keys', async () => {
        repository.find.mockResolvedValue([{ id: 1, key: 'keep' }, { id: 2, key: 'remove' }] as any);
        repository.save.mockResolvedValue([{ key: 'new', value: 'val', description: 'desc' }] as any);

        await service.reconcileDefaults({ keep: 'v1', new: 'val' }, { keep: 'k-desc', new: 'desc' });

        expect(repository.save).toHaveBeenCalledWith([{ key: 'new', value: 'val', description: 'desc' }]);
        expect(repository.save).toHaveBeenCalledWith({ id: 1, description: 'k-desc' });
        expect(repository.save).toHaveBeenCalledWith({ id: 2, description: undefined });
        expect(repository.save).toHaveBeenCalledTimes(3);
        expect(repository.delete).toHaveBeenCalledTimes(1);
        const deleteArgs = repository.delete.mock.calls[0][0] as any;
        expect(deleteArgs.key._value).toEqual(expect.arrayContaining(['remove']));
    });

    it('checks database health by initializing and running a query', async () => {
        dataSource.isInitialized = false;
        dataSource.initialize.mockResolvedValue(undefined);
        dataSource.query.mockResolvedValueOnce([{ 1: 1 }] as any);

        const result = await service.checkHealth();

        expect(dataSource.initialize).toHaveBeenCalled();
        expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
        expect(result.status).toBe('ok');
        expect(result.checks.database).toBe('up');
    });

    it('throws service unavailable when health check fails', async () => {
        dataSource.isInitialized = true;
        dataSource.query.mockRejectedValueOnce(new Error('boom'));

        await expect(service.checkHealth()).rejects.toBeInstanceOf(ServiceUnavailableException);
        expect(dataSource.initialize).not.toHaveBeenCalled();
        expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
    });
});
