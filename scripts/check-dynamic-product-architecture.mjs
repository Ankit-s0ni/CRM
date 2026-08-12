import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const genericDirectory = join(root, 'apps/api/src/platform/product-integration');
const forbiddenImports = ['HRMS_MANIFEST', 'HRMS_CAPABILITIES', 'HRMS_PERMISSIONS'];
const forbiddenLiterals = ['HRMS', 'ATTENDANCE', 'PAYROLL', 'LEAVE', 'FIELD_TRACKING'];
const failures = [];
const contractVersions = new Set();

if (existsSync(join(root, 'packages/product-contracts/package.json'))) {
  failures.push('packages/product-contracts must not exist; consume the published package');
}

for (const file of await files(genericDirectory)) {
  if (!file.endsWith('.ts') || file.endsWith('.spec.ts')) continue;
  const source = await readFile(file, 'utf8');
  for (const symbol of forbiddenImports) {
    if (source.includes(symbol)) failures.push(`${relative(root, file)} imports/references ${symbol}`);
  }
  for (const literal of forbiddenLiterals) {
    const pattern = new RegExp(`(['\"\\x60])${literal}\\1`);
    if (pattern.test(source)) failures.push(`${relative(root, file)} contains product literal ${literal}`);
  }
}

const manifests = await files(root);
for (const file of manifests.filter((path) => path.endsWith('package.json'))) {
  if (file.includes('/node_modules/') || file.includes('/.next/')) continue;
  const pkg = JSON.parse(await readFile(file, 'utf8'));
  const version = pkg.dependencies?.['@mariya-abdul/deltcrm-product-contracts'];
  if (version) contractVersions.add(version);
  if (version && !/^\d+\.\d+\.\d+$/.test(version)) {
    failures.push(`${relative(root, file)} must pin an exact product-contract version; found ${version}`);
  }
  if (version && Number(version.split('.')[0]) < 2) {
    failures.push(`${relative(root, file)} must use product-contract v2 or newer; found ${version}`);
  }
}

if (contractVersions.size > 1) {
  failures.push(`product-contract versions are mixed: ${[...contractVersions].join(', ')}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log('Dynamic product architecture boundary is clean.');

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.next') return [];
    return entry.isDirectory() ? files(path) : [path];
  }))).flat();
}
