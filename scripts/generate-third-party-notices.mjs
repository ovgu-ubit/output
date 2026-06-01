#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(new URL('..', import.meta.url).pathname);
const lockPath = path.join(repoRoot, 'package-lock.json');
const outputPath = path.join(repoRoot, 'THIRD_PARTY_NOTICES.md');
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
const packages = lock.packages ?? {};

const APPS = [
  { dir: 'output-api', label: 'output-api' },
  { dir: 'output-ui', label: 'output-ui' },
  { dir: 'output-interfaces', label: 'output-interfaces' },
];

const MANUAL_LICENSES = new Map([
  ['output-api/node_modules/busboy', { license: 'MIT', note: 'Manuell geprüft: package.json enthält licenses[0].type=MIT und LICENSE-Datei.' }],
  ['output-api/node_modules/passport-local', { license: 'MIT', note: 'Manuell geprüft: package.json enthält licenses[0].type=MIT und LICENSE-Datei.' }],
  ['output-api/node_modules/passport-strategy', { license: 'MIT', note: 'Manuell geprüft: package.json enthält licenses[0].type=MIT und LICENSE-Datei.' }],
  ['output-api/node_modules/pause', { license: 'MIT', note: 'Manuell geprüft: Readme.md enthält MIT-Lizenztext.' }],
  ['output-api/node_modules/streamsearch', { license: 'MIT', note: 'Manuell geprüft: package.json enthält licenses[0].type=MIT und LICENSE-Datei.' }],
  ['output-ui/node_modules/daemon', { license: 'MIT', note: 'Manuell geprüft: LICENSE-Datei enthält MIT-Lizenztext.' }],
  ['output-ui/node_modules/service', { license: 'NOASSERTION', note: 'Manuell geprüft: package.json und README.md enthalten kein Lizenzfeld bzw. keinen Lizenzhinweis.' }],
]);

function dependencyNameFromSpec(spec) {
  if (spec.startsWith('@')) {
    const [scope, name] = spec.split('/');
    return `${scope}/${name}`;
  }
  return spec.split('/')[0];
}

function displayName(lockPath, pkg) {
  if (pkg.name) return pkg.name;
  const afterNodeModules = lockPath.includes('/node_modules/')
    ? lockPath.slice(lockPath.lastIndexOf('/node_modules/') + '/node_modules/'.length)
    : lockPath.replace(/^node_modules\//, '');
  return dependencyNameFromSpec(afterNodeModules);
}

function licenseFromPackageJson(lockPath, pkg) {
  if (typeof pkg.license === 'string') return { license: pkg.license, note: '' };
  if (Array.isArray(pkg.licenses) && pkg.licenses.length > 0) {
    return {
      license: pkg.licenses.map((license) => license.type ?? license).join(' OR '),
      note: 'Aus package.json/licenses übernommen, da package-lock.json kein license-Feld enthält.',
    };
  }
  const manual = MANUAL_LICENSES.get(lockPath);
  if (manual) return manual;
  return { license: 'NOASSERTION', note: 'Kein license-Feld in package-lock.json gefunden.' };
}

function parentPackagePath(packagePath) {
  if (!packagePath) return '';
  return path.posix.dirname(packagePath);
}

function resolveDependency(fromPackagePath, depName) {
  const candidates = [];
  if (!fromPackagePath) {
    candidates.push(`node_modules/${depName}`);
  } else {
    let current = fromPackagePath;
    while (current && current !== '.') {
      candidates.push(`${current}/node_modules/${depName}`);
      current = path.posix.dirname(current);
    }
    candidates.push(`node_modules/${depName}`);
  }
  return candidates.find((candidate) => packages[candidate]);
}

function workspaceDependencyEntries(app) {
  const workspace = packages[app.dir];
  if (!workspace) throw new Error(`Workspace ${app.dir} nicht in package-lock.json gefunden.`);
  const result = [];
  for (const [name] of Object.entries(workspace.dependencies ?? {})) {
    result.push({ name, scope: 'runtime' });
  }
  for (const [name] of Object.entries(workspace.devDependencies ?? {})) {
    result.push({ name, scope: 'dev' });
  }
  return result;
}

function collectAppPackages(app) {
  const seen = new Map();
  const queue = [];

  for (const direct of workspaceDependencyEntries(app)) {
    const resolved = resolveDependency(app.dir, direct.name);
    if (!resolved) {
      console.warn(`[WARN] ${app.label}: dependency ${direct.name} konnte nicht im Lockfile aufgelöst werden.`);
      continue;
    }
    queue.push({ lockPath: resolved, scope: direct.scope });
  }

  while (queue.length > 0) {
    const item = queue.shift();
    const pkg = packages[item.lockPath];
    if (!pkg || pkg.link) continue;

    const existing = seen.get(item.lockPath);
    if (existing) {
      if (existing.scope === 'transitive' && item.scope !== 'transitive') existing.scope = item.scope;
      continue;
    }
    seen.set(item.lockPath, { scope: item.scope });

    const dependencies = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.optionalDependencies ?? {}),
    };
    for (const depName of Object.keys(dependencies)) {
      const resolved = resolveDependency(item.lockPath, depName);
      if (resolved) queue.push({ lockPath: resolved, scope: 'transitive' });
    }
  }

  return seen;
}

const byPackage = new Map();
const appPackageMaps = new Map(APPS.map((app) => [app.label, collectAppPackages(app)]));

for (const app of APPS) {
  for (const [lockPath, appData] of appPackageMaps.get(app.label)) {
    const pkg = packages[lockPath];
    const key = `${displayName(lockPath, pkg)}@${pkg.version ?? ''}|${licenseFromPackageJson(lockPath, pkg).license}`;
    if (!byPackage.has(key)) {
      const license = licenseFromPackageJson(lockPath, pkg);
      byPackage.set(key, {
        name: displayName(lockPath, pkg),
        version: pkg.version ?? '',
        license: license.license,
        apps: new Map(),
        lockPaths: new Set(),
        notes: new Set(),
      });
    }
    const entry = byPackage.get(key);
    entry.lockPaths.add(lockPath);
    if (licenseFromPackageJson(lockPath, pkg).note) entry.notes.add(licenseFromPackageJson(lockPath, pkg).note);
    const scopes = entry.apps.get(app.label) ?? new Set();
    scopes.add(appData.scope);
    entry.apps.set(app.label, scopes);
  }
}

function appScopeText(apps) {
  return APPS
    .filter((app) => apps.has(app.label))
    .map((app) => `${app.label} (${[...apps.get(app.label)].sort().join(', ')})`)
    .join('<br>');
}

function escapeCell(value) {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', '<br>');
}

const entries = [...byPackage.values()].sort((a, b) =>
  a.name.localeCompare(b.name) || a.version.localeCompare(b.version) || a.license.localeCompare(b.license),
);

const missingLockLicense = [];
for (const app of APPS) {
  for (const lockPath of appPackageMaps.get(app.label).keys()) {
    const pkg = packages[lockPath];
    if (!pkg.license) missingLockLicense.push(`${app.label}: ${lockPath}@${pkg.version ?? ''}`);
  }
}

const noAssertion = entries.filter((entry) => entry.license === 'NOASSERTION');

const generatedAt = new Date().toISOString().slice(0, 10);
const lines = [];
lines.push('# Third Party Notices');
lines.push('');
lines.push(`Stand: ${generatedAt}`);
lines.push('');
lines.push('Diese zentrale Drittanbieter-Lizenzübersicht wurde aus `package-lock.json` erzeugt. Sie enthält die tatsächlich aufgelösten npm-Pakete, die über die Workspace-Abhängigkeiten von `output-api`, `output-ui` und `output-interfaces` erreichbar sind. Interne Workspace-Pakete sind nicht als Drittanbieter-Komponenten aufgeführt.');
lines.push('');
lines.push('## Verteilungshinweise');
lines.push('');
lines.push('- Diese Datei muss bei der Distribution der Anwendung und insbesondere beim Ausliefern des Frontend-Bundles zusammen mit den Distributionsartefakten verfügbar sein.');
lines.push('- Für Pakete unter Apache-2.0, MIT, BSD-2-Clause, BSD-3-Clause, ISC, Python-2.0, CC-BY-3.0 und CC-BY-4.0 müssen die jeweiligen Copyright-, Lizenz- und Attributionshinweise mitgeführt werden. Diese Übersicht benennt die betroffenen Pakete; die vollständigen Lizenztexte bzw. Paket-LICENSE-Dateien sind beim Packaging beizulegen, wenn sie nicht bereits im Artefakt enthalten sind.');
lines.push('- `NOASSERTION` bedeutet: Im Lockfile und bei der manuellen Prüfung wurde kein belastbarer Lizenzhinweis gefunden. Solche Pakete sollten vor einer Distribution ersetzt, entfernt oder rechtlich geprüft werden.');
lines.push('');
lines.push('## Manuell geprüfte Pakete ohne `license`-Feld im Lockfile');
lines.push('');
lines.push('| Paket | App | Ergebnis | Hinweis |');
lines.push('| --- | --- | --- | --- |');
for (const [lockPath, manual] of MANUAL_LICENSES) {
  const pkg = packages[lockPath];
  if (!pkg) continue;
  const app = APPS.find((candidate) => lockPath.startsWith(`${candidate.dir}/`))?.label ?? 'workspace';
  lines.push(`| ${escapeCell(`${displayName(lockPath, pkg)}@${pkg.version ?? ''}`)} | ${app} | ${escapeCell(manual.license)} | ${escapeCell(manual.note)} |`);
}
lines.push('');
lines.push('## Lizenzübersicht');
lines.push('');
lines.push('| Paket | Version | Lizenz | Scope / App | Lockfile-Pfad(e) | Hinweise |');
lines.push('| --- | --- | --- | --- | --- | --- |');
for (const entry of entries) {
  lines.push(`| ${escapeCell(entry.name)} | ${escapeCell(entry.version)} | ${escapeCell(entry.license)} | ${escapeCell(appScopeText(entry.apps))} | ${escapeCell([...entry.lockPaths].sort().join('<br>'))} | ${escapeCell([...entry.notes].sort().join('<br>'))} |`);
}
lines.push('');
lines.push('## Pakete ohne `license`-Feld in `package-lock.json`');
lines.push('');
if (missingLockLicense.length === 0) {
  lines.push('Keine.');
} else {
  for (const item of [...new Set(missingLockLicense)].sort()) lines.push(`- ${item}`);
}
lines.push('');
lines.push('## Pakete ohne ermittelbare Lizenz');
lines.push('');
if (noAssertion.length === 0) {
  lines.push('Keine.');
} else {
  for (const entry of noAssertion) lines.push(`- ${entry.name}@${entry.version} (${appScopeText(entry.apps).replaceAll('<br>', ', ')})`);
}
lines.push('');

fs.writeFileSync(outputPath, `${lines.join('\n')}\n`);
console.log(`Generated ${path.relative(repoRoot, outputPath)} with ${entries.length} package entries.`);
if (missingLockLicense.length > 0) console.log(`Packages without license field in package-lock.json: ${new Set(missingLockLicense).size}`);
if (noAssertion.length > 0) console.log(`Packages without determinable license: ${noAssertion.length}`);
