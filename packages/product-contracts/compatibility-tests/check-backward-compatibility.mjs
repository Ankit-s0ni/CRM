import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const baseline = read('./baselines/hrms.v1.json');
const current = read('../manifests/hrms.v1.json');

assert.equal(current.key, baseline.key, 'product key is immutable');
assert.equal(current.frontendPathTemplate, baseline.frontendPathTemplate, 'frontend route is immutable in v1');
assert.equal(current.apiPath, baseline.apiPath, 'API route is immutable in v1');
for (const permission of baseline.permissions) {
  assert(current.permissions.includes(permission), `removed permission: ${permission}`);
}
for (const capability of baseline.capabilities) {
  assert(current.capabilities.includes(capability), `removed capability: ${capability}`);
}
console.log('Product contracts remain backward compatible with v1.0.0.');
