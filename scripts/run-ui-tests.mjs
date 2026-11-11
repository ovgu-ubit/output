import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspaceRoot = fileURLToPath(new URL('../', import.meta.url));
const uiRoot = resolve(workspaceRoot, 'output-ui');
const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const configuredBrowserPath = process.env.PLAYWRIGHT_BROWSERS_PATH;

process.env.PLAYWRIGHT_BROWSERS_PATH = configuredBrowserPath === '0'
  ? '0'
  : resolve(workspaceRoot, configuredBrowserPath || 'node_modules/.cache/output-ui-playwright');

function runCli(packageName, cliFile, cliArgs) {
  const cli = resolve(dirname(require.resolve(`${packageName}/package.json`)), cliFile);
  const result = spawnSync(process.execPath, [cli, ...cliArgs], {
    cwd: uiRoot,
    env: process.env,
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

function installBrowser(options = []) {
  console.log(`Preparing Chromium in ${process.env.PLAYWRIGHT_BROWSERS_PATH}`);
  if (runCli('playwright', 'cli.js', ['install', '--only-shell', ...options, 'chromium']) !== 0) {
    throw new Error('Chromium installation failed. UI tests were not started.');
  }
}

try {
  // Set the browser location before importing Playwright so setup and tests agree.
  const { chromium } = await import('playwright');
  const checkBrowser = async () => {
    const browser = await chromium.launch({
      headless: true,
      ...(process.env.CHROME_BIN ? { executablePath: process.env.CHROME_BIN } : {}),
    });
    await browser.close();
  };

  if (args.includes('--install-browser')) {
    installBrowser(args.includes('--with-deps') ? ['--with-deps'] : []);
  }
  try {
    await checkBrowser();
  } catch (error) {
    if (process.env.CHROME_BIN || !String(error).includes("Executable doesn't exist")) throw error;
    // A partial installation can retain its marker after the executable is lost.
    installBrowser(['--force']);
    await checkBrowser();
  }
  if (!args.includes('--install-browser')) {
    process.exitCode = runCli('@angular/cli', 'bin/ng.js', ['test', ...args]);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
