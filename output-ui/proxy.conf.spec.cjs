const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { relative, resolve } = require('node:path');
const { test } = require('node:test');

function loadProxy(t, { contents, env = {}, nodeEnv = 'dev', cwd = __dirname, relativeConfigDir = false } = {}) {
  const configDir = mkdtempSync(resolve(tmpdir(), 'output-proxy-'));
  t.after(() => rmSync(configDir, { recursive: true, force: true }));
  if (contents !== undefined) {
    writeFileSync(resolve(configDir, `env.${nodeEnv}`), contents);
  }
  const childEnv = { ...process.env };
  for (const key of ['APP_PORT', 'PORT', 'APP_SSL', 'CONFIG_DIR', 'NODE_ENV']) {
    delete childEnv[key];
  }
  const result = spawnSync(process.execPath, [
    '-e', 'process.stdout.write(JSON.stringify(require(process.argv[1])))',
    resolve(__dirname, 'proxy.conf.cjs'),
  ], {
    cwd,
    encoding: 'utf8',
    env: {
      ...childEnv,
      CONFIG_DIR: relativeConfigDir ? relative(resolve(__dirname, '../output-api'), configDir) : configDir,
      ...(nodeEnv === 'dev' ? {} : { NODE_ENV: nodeEnv }),
      ...env,
    },
  });
  return result;
}

function target(result) {
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout)['/api/**'].target;
}

test('reads APP_PORT and APP_SSL from env.dev, including quotes and comments', (t) => {
  const result = loadProxy(t, { contents: 'APP_PORT="3010" # local port\nAPP_SSL=true\n' });
  assert.equal(target(result), 'https://localhost:3010');
});

test('environment APP_PORT overrides the backend file', (t) => {
  const result = loadProxy(t, { contents: 'APP_PORT=3010\n', env: { APP_PORT: '3020' } });
  assert.equal(target(result), 'http://localhost:3020');
});

test('PORT takes precedence over APP_PORT, as in the backend', (t) => {
  const result = loadProxy(t, { contents: 'APP_PORT=3010\n', env: { APP_PORT: '3020', PORT: '3030' } });
  assert.equal(target(result), 'http://localhost:3030');
});

test('selects the backend file using NODE_ENV', (t) => {
  const result = loadProxy(t, { contents: 'APP_PORT=3040\n', nodeEnv: 'test' });
  assert.equal(target(result), 'http://localhost:3040');
});

test('resolves relative CONFIG_DIR from the backend, independent of the caller directory', (t) => {
  const result = loadProxy(t, {
    contents: 'APP_PORT=3050\n',
    relativeConfigDir: true,
    cwd: resolve(__dirname, '..'),
  });
  assert.equal(target(result), 'http://localhost:3050');
});

test('keeps the previous default when no backend file or port is configured', (t) => {
  assert.equal(target(loadProxy(t)), 'http://localhost:3003');
});

test('accepts a port override without a backend file', (t) => {
  assert.equal(target(loadProxy(t, { env: { APP_PORT: '3060' } })), 'http://localhost:3060');
});

test('rejects invalid backend ports', (t) => {
  for (const port of ['abc', '0', '-1', '65536', '3010.5']) {
    const result = loadProxy(t, { env: { APP_PORT: port } });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /backend port.*must be between 1 and 65535/);
  }
});
