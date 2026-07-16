import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const excluded = new Set(['.git', '.next', '.pnpm-store', 'dist', 'node_modules']);
const sourceExtensions = new Set(['.js', '.json', '.mjs', '.sql', '.ts', '.tsx', '.yml', '.yaml']);
const secretPatterns = [
  /AQ\.[A-Za-z0-9_-]{24,}/,
  /-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----/,
  /(?:^|[^A-Za-z0-9])sk-[A-Za-z0-9_-]{24,}/,
];

const violations = [];
for (const file of walk(root)) {
  const path = relative(root, file);
  if (path.startsWith('docs/stitch_raw/') || path.includes('/public/stitch/')) continue;
  const extension = file.slice(file.lastIndexOf('.'));
  if (!sourceExtensions.has(extension)) continue;
  const contents = readFileSync(file, 'utf8');
  for (const pattern of secretPatterns) {
    if (pattern.test(contents)) violations.push(`${path}: matches ${pattern}`);
  }
}

const platformRoot = join(root, 'apps/api/src/modules/platform');
for (const file of walk(platformRoot)) {
  if (!file.endsWith('.ts') || file.endsWith('.spec.ts')) continue;
  const path = relative(root, file);
  const contents = readFileSync(file, 'utf8');
  if (contents.includes("shared/database/prisma.service") && !path.endsWith('platform-database.service.ts')) {
    violations.push(`${path}: platform code imports the tenant/admin Prisma service directly`);
  }
}

const platformDatabase = readFileSync(
  join(platformRoot, 'platform-auth/platform-database.service.ts'),
  'utf8',
);
if (!platformDatabase.includes('DATABASE_URL_PLATFORM')) {
  violations.push('PlatformDatabaseService does not use the isolated runtime connection');
}

const runtimeMigration = readFileSync(
  join(root, 'apps/api/prisma/migrations/20260717012000_platform_runtime_role/migration.sql'),
  'utf8',
);
for (const invariant of ['system_audit_logs', 'tenant_audit_logs', 'REVOKE UPDATE, DELETE, TRUNCATE']) {
  if (!runtimeMigration.includes(invariant)) {
    violations.push(`Platform runtime migration is missing: ${invariant}`);
  }
}

if (violations.length) {
  console.error(violations.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Security checks passed: no committed secrets or platform database boundary violations.');
}

function* walk(directory) {
  for (const entry of readdirSync(directory)) {
    if (excluded.has(entry)) continue;
    const file = join(directory, entry);
    const stat = statSync(file);
    if (stat.isDirectory()) yield* walk(file);
    else yield file;
  }
}
