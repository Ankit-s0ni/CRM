import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('../manifests/hrms.v1.json', import.meta.url), 'utf8'));
assert.equal(manifest.contractVersion, '1.0');
assert.equal(manifest.key, 'HRMS');
assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
assert.equal(manifest.frontendPathTemplate, '/{locale}/app/hrms');
assert.equal(manifest.apiPath, '/api/hrms');
assert.equal(new Set(manifest.permissions).size, manifest.permissions.length);
assert.equal(new Set(manifest.capabilities).size, manifest.capabilities.length);
for (const key of manifest.permissions) assert.match(key, /^[a-z][a-z0-9.-]*$/);
for (const key of manifest.capabilities) assert.match(key, /^[A-Z][A-Z0-9_]*$/);
assert.deepEqual(manifest.permissions, [
  'hrms.employees.read',
  'hrms.employees.manage',
  'hrms.attendance.self.read',
  'hrms.attendance.self.write',
  'hrms.attendance.read',
  'hrms.attendance.manage',
  'hrms.devices.self.read',
  'hrms.devices.self.write',
  'hrms.devices.read',
  'hrms.devices.manage',
  'hrms.leave.self.read',
  'hrms.leave.self.write',
  'hrms.leave.approve',
  'hrms.leave.read',
  'hrms.leave.manage',
  'hrms.payroll.read',
  'hrms.payroll.manage',
  'hrms.documents.read',
  'hrms.documents.manage',
]);
assert.deepEqual(manifest.capabilities, [
  'HRMS_EMPLOYEES',
  'HRMS_ORGANIZATION',
  'HRMS_ATTENDANCE',
  'HRMS_LEAVE',
  'HRMS_PAYROLL',
  'HRMS_DOCUMENTS',
]);

const schemaDirectory = new URL('../schemas/', import.meta.url);
const schemas = readdirSync(schemaDirectory).filter((file) => file.endsWith('.schema.json'));
assert.deepEqual(schemas.sort(), [
  'effective-entitlements.schema.json',
  'error-envelope.schema.json',
  'event-envelope.schema.json',
  'navigation.schema.json',
  'product-identity-status.schema.json',
  'product-manifest.schema.json',
  'product-token.schema.json',
  'provisioning-status.schema.json',
]);
for (const file of schemas) {
  const schema = JSON.parse(readFileSync(new URL(file, schemaDirectory), 'utf8'));
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(schema.additionalProperties, false, `${file} must reject unknown fields`);
}

const manifestSchema = JSON.parse(
  readFileSync(new URL('../schemas/product-manifest.schema.json', import.meta.url), 'utf8'),
);
assert.deepEqual(manifestSchema.properties.key.enum, ['HRMS', 'MAIL', 'POS']);
assert.equal(manifestSchema.allOf.length, 3);

const identitySchema = JSON.parse(
  readFileSync(
    new URL('../schemas/product-identity-status.schema.json', import.meta.url),
    'utf8',
  ),
);
assert.deepEqual(identitySchema.properties.tenantStatus.enum, [
  'ACTIVE',
  'SUSPENDED',
  'UNAVAILABLE',
]);
console.log('Product contracts are valid.');
