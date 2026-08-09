#!/usr/bin/env node

const platformBaseUrl = process.env.PLATFORM_BASE_URL ?? 'http://127.0.0.1:4011';
const hrmsBaseUrl = process.env.HRMS_BASE_URL ?? 'http://127.0.0.1:4014';
const platformHealthUrl =
  process.env.PLATFORM_HEALTH_URL ?? `${platformBaseUrl}/healthz`;
const hrmsHealthUrl = process.env.HRMS_HEALTH_URL ?? `${hrmsBaseUrl}/healthz`;
const workspace = process.env.PLATFORM_TEST_WORKSPACE ?? 'acme';
const email = requiredEnvironmentVariable('PLATFORM_TEST_EMAIL');
const password = requiredEnvironmentVariable('PLATFORM_TEST_PASSWORD');

const checks = [];

await checkJson(platformHealthUrl, {
  label: 'Platform health endpoint',
});
await checkJson(hrmsHealthUrl, {
  label: 'HRMS health endpoint',
});

const jwks = await checkJson(
  `${platformBaseUrl}/.well-known/jwks.json`,
  { label: 'Platform JWKS endpoint' },
);
assert(
  Array.isArray(jwks.keys) && jwks.keys.some((key) => key.alg === 'RS256'),
  'Platform JWKS contains an RS256 signing key',
);

const login = await checkJson(`${platformBaseUrl}/auth/login`, {
  label: 'Platform tenant login',
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-workspace-subdomain': workspace,
  },
  body: JSON.stringify({ email, password }),
});
const tenantToken = login.accessToken ?? login.access_token;
assert(typeof tenantToken === 'string', 'Platform login returned an access token');

const issuedToken = await checkJson(
  `${platformBaseUrl}/product-integration/token`,
  {
    label: 'Platform HRMS product-token issuance',
    method: 'POST',
    headers: {
      authorization: `Bearer ${tenantToken}`,
      'content-type': 'application/json',
      'x-workspace-subdomain': workspace,
    },
    body: JSON.stringify({ audience: 'hrms-api' }),
  },
);
const productToken = issuedToken.accessToken ?? issuedToken.access_token;
assert(typeof productToken === 'string', 'Platform returned an HRMS product token');

const claims = decodeJwtPayload(productToken);
assert(audienceIncludes(claims.aud, 'hrms-api'), 'Product token audience is hrms-api');
assert(Boolean(claims.tenantId ?? claims.tenant_id), 'Product token has a tenant claim');
assert(productClaimIncludesHrms(claims), 'Product token grants HRMS access');
assert(['en', 'ar'].includes(claims.locale), 'Product token carries a supported locale');
assert(
  Number.isInteger(claims.entitlementVersion) && claims.entitlementVersion > 0,
  'Product token carries a positive entitlement version',
);
assert(
  Number.isFinite(claims.exp) && Number.isFinite(claims.iat) && claims.exp - claims.iat <= 900,
  'Product token lifetime does not exceed 15 minutes',
);

await expectStatus(
  `${hrmsBaseUrl}/api/hrms/integration-context`,
  401,
  'HRMS rejects a request without a product token',
);
await expectStatus(
  `${hrmsBaseUrl}/api/hrms/integration-context`,
  401,
  'HRMS rejects a tenant session token',
  { authorization: `Bearer ${tenantToken}` },
);

const context = await checkJson(
  `${hrmsBaseUrl}/api/hrms/integration-context`,
  {
    label: 'HRMS accepts the Platform product token',
    headers: { authorization: `Bearer ${productToken}` },
  },
);
const tokenTenantId = claims.tenantId ?? claims.tenant_id;
assert(
  String(context.entitlements?.tenantId) === String(tokenTenantId),
  'HRMS context is scoped to the signed tenant',
);
assert(
  context.entitlements?.version === claims.entitlementVersion,
  'HRMS confirms the signed entitlement version is current',
);
assert(
  context.entitlements?.products?.some(
    ({ key, active }) => key === 'HRMS' && active === true,
  ),
  'HRMS confirms the tenant entitlement',
);
assert(
  context.provisioning?.productKey === 'HRMS',
  'HRMS returns its Platform-managed provisioning state',
);

console.log(`\nLocal Platform/HRMS contract smoke passed (${checks.length} checks).`);
for (const check of checks) console.log(`  PASS ${check}`);

function requiredEnvironmentVariable(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(2);
  }
  return value;
}

async function checkJson(url, options) {
  const { label, ...requestOptions } = options;
  const response = await fetch(url, requestOptions);
  const body = await parseJson(response, label);
  if (!response.ok) {
    throw new Error(`${label} returned HTTP ${response.status}: ${safeMessage(body)}`);
  }
  checks.push(label);
  return body;
}

async function expectStatus(url, expectedStatus, label, headers = {}) {
  const response = await fetch(url, { headers });
  if (response.status !== expectedStatus) {
    throw new Error(`${label}: expected HTTP ${expectedStatus}, received ${response.status}`);
  }
  checks.push(label);
}

async function parseJson(response, label) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`${label} returned a non-JSON response (HTTP ${response.status})`);
  }
}

function decodeJwtPayload(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Platform returned a malformed product token');
  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
}

function audienceIncludes(audience, expected) {
  return Array.isArray(audience) ? audience.includes(expected) : audience === expected;
}

function productClaimIncludesHrms(claims) {
  const product = claims.product ?? claims.productKey ?? claims.product_key;
  const products = claims.products ?? claims.entitlements;
  return (
    String(product).toUpperCase() === 'HRMS' ||
    (Array.isArray(products) &&
      products.some((entry) =>
        typeof entry === 'string'
          ? entry.toUpperCase() === 'HRMS'
          : String(entry?.key ?? entry?.productKey).toUpperCase() === 'HRMS',
      ))
  );
}

function assert(condition, label) {
  if (!condition) throw new Error(`Contract assertion failed: ${label}`);
  checks.push(label);
}

function safeMessage(body) {
  if (typeof body?.message === 'string') return body.message;
  if (typeof body?.code === 'string') return body.code;
  return 'request failed';
}
