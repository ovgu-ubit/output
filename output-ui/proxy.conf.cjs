const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { parseEnv } = require('node:util');

// Resolve relative CONFIG_DIR values as the backend does when started by npm.
const apiRoot = resolve(__dirname, '../output-api');
const configDir = resolve(apiRoot, process.env.CONFIG_DIR || '.');
const envFile = resolve(configDir, `env.${process.env.NODE_ENV || 'dev'}`);
let fileEnv = {};

try {
  fileEnv = parseEnv(readFileSync(envFile, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

// Read backend settings without putting credentials into the dev server's environment.
const env = { ...fileEnv, ...process.env };
const port = Number(env.PORT) || Number(env.APP_PORT ?? 3003);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('The backend port (PORT or APP_PORT) must be between 1 and 65535.');
}
const protocol = ['true', '1'].includes(env.APP_SSL?.toLowerCase()) ? 'https' : 'http';

module.exports = {
  '/api/**': {
    target: `${protocol}://localhost:${port}`,
    secure: false,
    logLevel: 'debug',
    changeOrigin: true,
    pathRewrite: { '^/api': '' },
  },
};
