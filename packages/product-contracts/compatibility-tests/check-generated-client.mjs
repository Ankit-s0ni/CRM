import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const openApi = JSON.parse(
  readFileSync(
    new URL('../openapi/product-integration.v1.json', import.meta.url),
    'utf8',
  ),
);
const clientSource = readFileSync(
  new URL('../generated/product-integration-client.ts', import.meta.url),
  'utf8',
);

const expectedOperations = {
  issueProductToken: {
    clientMethod: 'issueToken',
    method: 'POST',
    path: '/product-integration/token',
  },
  getEffectiveEntitlements: {
    clientMethod: 'entitlements',
    method: 'GET',
    path: '/product-integration/entitlements',
  },
  getEntitledNavigation: {
    clientMethod: 'navigation',
    method: 'GET',
    path: '/product-integration/navigation',
  },
  getProductManifest: {
    clientMethod: 'manifest',
    method: 'GET',
    path: '/internal/v1/products/${encodeURIComponent(productKey)}/manifest',
  },
  getTenantEntitlements: {
    clientMethod: 'tenantEntitlements',
    method: 'GET',
    path: '/internal/v1/tenants/${encodeURIComponent(tenantId)}/entitlements',
  },
  getProductIdentityStatus: {
    clientMethod: 'identityStatus',
    method: 'GET',
    path: '/internal/v1/tenants/${encodeURIComponent(tenantId)}/users/${encodeURIComponent(userId)}/identity-status?${query.toString()}',
  },
  getProductProvisioningStatus: {
    clientMethod: 'provisioningStatus',
    method: 'GET',
    path: '/internal/v1/tenants/${encodeURIComponent(tenantId)}/products/${encodeURIComponent(productKey)}/status',
  },
};

const operations = Object.entries(openApi.paths).flatMap(([path, pathItem]) =>
  Object.entries(pathItem).map(([method, operation]) => ({
    operationId: operation.operationId,
    method: method.toUpperCase(),
    path,
  })),
);

assert.deepEqual(
  new Set(operations.map(({ operationId }) => operationId)),
  new Set(Object.keys(expectedOperations)),
  'The generated client operation map must cover every OpenAPI operation',
);

for (const operation of operations) {
  const expected = expectedOperations[operation.operationId];
  assert.equal(operation.method, expected.method);
  assert.match(
    clientSource,
    new RegExp(`\\b${expected.clientMethod}\\s*\\(`),
    `${operation.operationId} is missing from the generated client`,
  );
  assert.ok(
    clientSource.includes(expected.path),
    `${operation.operationId} does not use the OpenAPI route`,
  );
  if (expected.method === 'POST') {
    assert.ok(
      clientSource.includes("method: 'POST'"),
      `${operation.operationId} must use POST`,
    );
  }
}

console.log('Generated product client matches the OpenAPI operation surface.');
