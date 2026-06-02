import { DemoResetProcessRunner, DemoResetService } from './demo-reset.service';

class TestDemoResetService extends DemoResetService {
  private snapshotExists = true;

  public setSnapshotExists(snapshotExists: boolean) {
    this.snapshotExists = snapshotExists;
  }

  protected isReadableFile(_path: string): boolean {
    return this.snapshotExists;
  }
}

const baseConfig = {
  DEMO_MODE: 'true',
  DEMO_RESET_SQL_PATH: '/config/demo-reset.sql',
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: '5432',
  DATABASE_NAME: 'output',
  DATABASE_USER: 'output-user',
  DATABASE_PASSWORD: 'output-password'
};

describe('DemoResetService', () => {
  const createService = (config: Record<string, unknown> = {}) => {
    const values = {
      ...baseConfig,
      ...config
    };
    const configService = {
      get: jest.fn(async (key: string) => values[key]),
      reconcileDefaults: jest.fn().mockResolvedValue(undefined),
      normalizeAtomicArrayValues: jest.fn().mockResolvedValue(undefined)
    };
    const queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      query: jest.fn(async (query: string) => {
        if (query.includes('information_schema.tables')) {
          return [
            { table_name: 'author' },
            { table_name: 'migrations' },
            { table_name: 'publication' }
          ];
        }
        return [];
      }),
      release: jest.fn().mockResolvedValue(undefined)
    };
    const dataSource = {
      createQueryRunner: jest.fn(() => queryRunner)
    };
    const processRunner: jest.MockedFunction<DemoResetProcessRunner> = jest.fn().mockResolvedValue(undefined);
    const service = new TestDemoResetService(configService as any, dataSource as any, processRunner);

    return { configService, dataSource, processRunner, queryRunner, service };
  };

  it('does not reset when demo mode is disabled', async () => {
    const { dataSource, processRunner, service } = createService({ DEMO_MODE: 'false' });

    await expect(service.resetDemoDatabase('startup')).resolves.toBe(false);

    expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    expect(processRunner).not.toHaveBeenCalled();
  });

  it('resets when demo mode is enabled', async () => {
    const { configService, processRunner, queryRunner, service } = createService();

    await expect(service.resetDemoDatabase('startup')).resolves.toBe(true);

    expect(queryRunner.connect).toHaveBeenCalled();
    expect(queryRunner.query).toHaveBeenCalledWith('SELECT pg_advisory_lock($1)', [expect.any(Number)]);
    expect(queryRunner.query).toHaveBeenCalledWith('SELECT pg_advisory_unlock($1)', [expect.any(Number)]);
    expect(queryRunner.release).toHaveBeenCalled();
    expect(processRunner).toHaveBeenCalledTimes(1);
    expect(configService.reconcileDefaults).toHaveBeenCalled();
    expect(configService.normalizeAtomicArrayValues).toHaveBeenCalledWith(['ror_id', 'openalex_id']);
  });

  it('passes transactional psql arguments and password environment', async () => {
    const { processRunner, service } = createService();

    await service.resetOnStartup();

    const [args, env] = processRunner.mock.calls[0];
    expect(args).toEqual(expect.arrayContaining([
      '--host', 'localhost',
      '--port', '5432',
      '--username', 'output-user',
      '--dbname', 'output',
      '--no-password',
      '--single-transaction',
      '-v', 'ON_ERROR_STOP=1',
      '--file', '/config/demo-reset.sql'
    ]));
    expect(env.PGPASSWORD).toBe('output-password');
  });

  it('truncates public tables except the migrations table before importing the snapshot', async () => {
    const { processRunner, service } = createService();

    await service.resetOnStartup();

    const [args] = processRunner.mock.calls[0];
    const command = args[args.indexOf('--command') + 1];
    expect(command).toContain('ALTER TABLE %s ALTER CONSTRAINT %I DEFERRABLE INITIALLY DEFERRED');
    expect(command).toContain('SET CONSTRAINTS ALL DEFERRED');
    expect(command).toContain('TRUNCATE TABLE');
    expect(command).toContain('"public"."author"');
    expect(command).toContain('"public"."publication"');
    expect(command).toContain('RESTART IDENTITY CASCADE');
    expect(command).not.toContain('"public"."migrations"');
  });

  it('fails startup reset when DEMO_RESET_SQL_PATH is missing', async () => {
    const { dataSource, processRunner, service } = createService({ DEMO_RESET_SQL_PATH: '' });

    await expect(service.resetOnStartup()).rejects.toThrow('DEMO_RESET_SQL_PATH');

    expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    expect(processRunner).not.toHaveBeenCalled();
  });

  it('fails startup reset when the SQL snapshot file is missing', async () => {
    const { dataSource, processRunner, service } = createService();
    service.setSnapshotExists(false);

    await expect(service.resetOnStartup()).rejects.toThrow('Demo reset SQL snapshot');

    expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    expect(processRunner).not.toHaveBeenCalled();
  });

  it('logs scheduled reset failures without throwing', async () => {
    const { processRunner, queryRunner, service } = createService();
    processRunner.mockRejectedValueOnce(new Error('psql failed'));
    const errorSpy = jest.spyOn((service as any).logger, 'error').mockImplementation();

    await expect(service.resetOnSchedule()).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith('Scheduled demo database reset failed.', expect.stringContaining('psql failed'));
    expect(queryRunner.release).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
