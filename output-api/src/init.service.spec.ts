import { DataSource, Repository } from "typeorm";
import { InitService } from "./init.service";

type InitRepositories = ConstructorParameters<typeof InitService> extends [DataSource, ...infer Repositories]
    ? Repositories
    : never;

function createRepository() {
    return {
        save: jest.fn(async (value) => value),
    } as unknown as Repository<unknown>;
}

function createRepositories() {
    return Array.from({ length: 20 }, createRepository) as InitRepositories;
}

function createService(dataSourceOverrides: Partial<DataSource> = {}) {
    const dataSource = {
        migrations: [{ name: "InitialMigration", timestamp: 1 }],
        synchronize: jest.fn().mockResolvedValue(undefined),
        runMigrations: jest.fn().mockResolvedValue([{ name: "InitialMigration" }]),
        ...dataSourceOverrides,
    } as unknown as DataSource;

    return {
        dataSource,
        service: new InitService(dataSource, ...createRepositories()),
    };
}

describe("InitService", () => {
    beforeEach(() => {
        jest.spyOn(console, "log").mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("marks migrations as executed after synchronizing the schema", async () => {
        const { dataSource, service } = createService();

        await service.init();

        expect(dataSource.synchronize).toHaveBeenCalledWith(true);
        expect(dataSource.runMigrations).toHaveBeenCalledWith({ fake: true, transaction: "all" });
        expect((dataSource.synchronize as jest.Mock).mock.invocationCallOrder[0])
            .toBeLessThan((dataSource.runMigrations as jest.Mock).mock.invocationCallOrder[0]);
    });

    it("fails when no migrations were loaded", async () => {
        const { dataSource, service } = createService({ migrations: [] });

        await expect(service.init()).rejects.toThrow("No migrations were loaded");

        expect(dataSource.runMigrations).not.toHaveBeenCalled();
    });
});
