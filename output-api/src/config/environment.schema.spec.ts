import { EnvSchemas } from './environment.schema';

const validEnv = {
  AUTH_SERVICE_PATH: 'authorization/token.authorization.service',
  AUTH_SERVICE_EXPORT: 'TokenAuthorizationService',
  APP_PORT: '3003',
  APP_LOG_PATH: './log/',
  APP_CONFIG_PATH: './config/',
  DATABASE_TYPE: 'postgres',
  DATABASE_HOST: 'localhost',
  DATABASE_PORT: '5432',
  DATABASE_NAME: 'output',
  DATABASE_USER: 'output',
  DATABASE_PASSWORD: 'output'
};

describe('EnvSchemas', () => {
  it('accepts demo settings as optional values', () => {
    const result = EnvSchemas.safeParse(validEnv);

    expect(result.success).toBe(true);
  });

  it.each([
    ['true', true],
    ['1', true],
    ['false', false],
    ['0', false],
  ])('parses DEMO_MODE=%s as %s', (value, expected) => {
    const result = EnvSchemas.parse({
      ...validEnv,
      AUTH: 'true',
      DEMO_MODE: value,
      DEMO_USER: 'demo',
      DEMO_PW: 'secret',
      ...(expected ? { DEMO_RESET_SQL_PATH: '/config/demo-reset.sql' } : {})
    });

    expect(result.DEMO_MODE).toBe(expected);
    expect(result.DEMO_USER).toBe('demo');
    expect(result.DEMO_PW).toBe('secret');
  });

  it('rejects invalid DEMO_MODE values', () => {
    expect(() => EnvSchemas.parse({
      ...validEnv,
      DEMO_MODE: 'enabled'
    })).toThrow();
  });

  it('requires demo credentials when DEMO_MODE is enabled', () => {
    const result = EnvSchemas.safeParse({
      ...validEnv,
      AUTH: 'true',
      DEMO_MODE: 'true',
      DEMO_RESET_SQL_PATH: '/config/demo-reset.sql'
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map(issue => issue.path.join('.'))).toEqual(expect.arrayContaining(['DEMO_USER', 'DEMO_PW']));
    }
  });

  it.each([
    ['false'],
    ['0'],
    ['enabled'],
    [undefined],
  ])('requires AUTH=true when DEMO_MODE is enabled and AUTH=%s', (auth) => {
    const result = EnvSchemas.safeParse({
      ...validEnv,
      ...(auth === undefined ? {} : { AUTH: auth }),
      DEMO_MODE: 'true',
      DEMO_USER: 'demo',
      DEMO_PW: 'secret',
      DEMO_RESET_SQL_PATH: '/config/demo-reset.sql'
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map(issue => issue.path.join('.'))).toContain('AUTH');
    }
  });

  it('requires DEMO_RESET_SQL_PATH when DEMO_MODE is enabled', () => {
    const result = EnvSchemas.safeParse({
      ...validEnv,
      AUTH: 'true',
      DEMO_MODE: 'true',
      DEMO_USER: 'demo',
      DEMO_PW: 'secret'
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map(issue => issue.path.join('.'))).toContain('DEMO_RESET_SQL_PATH');
    }
  });
});
