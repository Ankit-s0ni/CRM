import {
  PRODUCT_CONTRACT_VERSION,
  type EffectiveEntitlements,
  type ProductEventEnvelope,
  type ProductIdentityStatus,
  type ProductManifest,
  type ProductTokenClaims,
} from './contracts';
import {
  PRODUCT_CAPABILITY_KEYS,
  PRODUCT_PERMISSION_KEYS,
  productForAudience,
} from './registry';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY_PATTERN = /^[A-Z][A-Z0-9_]*$/;
const PERMISSION_PATTERN = /^[a-z][a-z0-9.-]*$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const PRODUCT_KEYS = new Set(['HRMS', 'MAIL', 'POS']);
const PRODUCT_AUDIENCES = new Set(['hrms-api', 'mail-api', 'pos-api']);
const SUBSCRIPTION_STATUSES = new Set([
  'TRIALING',
  'ACTIVE',
  'PAST_DUE',
  'SUSPENDED',
  'CANCELED',
  'NONE',
]);
const IDENTITY_STATUSES = new Set(['ACTIVE', 'SUSPENDED', 'UNAVAILABLE']);

function rejectUnknownKeys(
  value: object | null | undefined,
  allowed: readonly string[],
  issues: string[],
) {
  if (!value) return;
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length) issues.push(`unknown properties: ${unknown.join(', ')}`);
}

function rejectUnknownCapabilities(
  productKey: keyof typeof PRODUCT_CAPABILITY_KEYS,
  values: readonly string[] | undefined,
  issues: string[],
) {
  const known = new Set<string>(PRODUCT_CAPABILITY_KEYS[productKey]);
  for (const value of values ?? []) {
    if (!known.has(value)) issues.push(`unknown ${productKey} capability: ${value}`);
  }
}

function rejectUnknownPermissions(
  productKey: keyof typeof PRODUCT_PERMISSION_KEYS,
  values: readonly string[] | undefined,
  issues: string[],
) {
  const known = new Set<string>(PRODUCT_PERMISSION_KEYS[productKey]);
  for (const value of values ?? []) {
    if (!known.has(value)) issues.push(`unknown ${productKey} permission: ${value}`);
  }
}

export class ContractValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Contract validation failed: ${issues.join(', ')}`);
  }
}

export function assertProductManifest(value: unknown): asserts value is ProductManifest {
  const manifest = value as Partial<ProductManifest> | null;
  const issues: string[] = [];
  if (!manifest || typeof manifest !== 'object') issues.push('manifest must be an object');
  rejectUnknownKeys(manifest, [
    'contractVersion', 'key', 'name', 'version', 'frontendPathTemplate',
    'apiPath', 'healthEndpoint', 'readinessEndpoint', 'permissions',
    'capabilities', 'eventsConsumed', 'eventsPublished',
  ], issues);
  if (manifest?.contractVersion !== PRODUCT_CONTRACT_VERSION) issues.push('unsupported contractVersion');
  if (!manifest?.key || !PRODUCT_KEYS.has(manifest.key)) issues.push('unknown product key');
  if (!manifest?.version || !SEMVER_PATTERN.test(manifest.version)) issues.push('invalid semantic version');
  if (!manifest?.frontendPathTemplate?.startsWith('/{locale}/app/')) issues.push('invalid frontend path');
  if (!manifest?.apiPath?.startsWith('/api/')) issues.push('invalid API path');
  if (!manifest?.permissions?.every((key) => PERMISSION_PATTERN.test(key))) issues.push('invalid permission key');
  if (!manifest?.capabilities?.every((key) => KEY_PATTERN.test(key))) issues.push('invalid capability key');
  if (manifest?.key && PRODUCT_KEYS.has(manifest.key)) {
    rejectUnknownPermissions(manifest.key, manifest.permissions, issues);
    rejectUnknownCapabilities(manifest.key, manifest.capabilities, issues);
  }
  if (issues.length) throw new ContractValidationError(issues);
}

export function assertProductTokenClaims(value: unknown): asserts value is ProductTokenClaims {
  const claims = value as Partial<ProductTokenClaims> | null;
  const issues: string[] = [];
  if (!claims || typeof claims !== 'object') issues.push('claims must be an object');
  rejectUnknownKeys(claims, [
    'sub', 'tenantId', 'userId', 'membershipId', 'roles', 'products',
    'capabilities', 'permissions', 'locale', 'entitlementVersion', 'iss',
    'aud', 'iat', 'exp', 'jti',
  ], issues);
  for (const key of ['tenantId', 'userId', 'membershipId', 'sub', 'jti'] as const) {
    if (!claims?.[key] || !UUID_PATTERN.test(claims[key]!)) issues.push(`invalid ${key}`);
  }
  if (claims?.sub !== claims?.userId) issues.push('sub must equal userId');
  if (!claims?.iss?.startsWith('https://')) issues.push('issuer must use HTTPS');
  if (!claims?.aud || !PRODUCT_AUDIENCES.has(claims.aud)) issues.push('unknown audience');
  if (!claims?.products?.every((key) => PRODUCT_KEYS.has(key))) issues.push('unknown product key');
  if (!claims?.capabilities?.every((key) => KEY_PATTERN.test(key))) issues.push('invalid capability key');
  if (!claims?.permissions?.every((key) => PERMISSION_PATTERN.test(key))) issues.push('invalid permission key');
  if (!claims?.locale || !new Set(['en', 'ar']).has(claims.locale)) issues.push('invalid locale');
  if (
    !Number.isInteger(claims?.entitlementVersion) ||
    (claims?.entitlementVersion ?? -1) < 0
  ) {
    issues.push('invalid entitlementVersion');
  }
  if (claims?.aud && PRODUCT_AUDIENCES.has(claims.aud)) {
    const tokenProduct = productForAudience(claims.aud);
    if (!claims.products?.includes(tokenProduct)) issues.push('audience product is missing');
    rejectUnknownCapabilities(tokenProduct, claims.capabilities, issues);
    rejectUnknownPermissions(tokenProduct, claims.permissions, issues);
  }
  if (!claims?.exp || !claims?.iat || claims.exp <= claims.iat) issues.push('invalid token lifetime');
  if (issues.length) throw new ContractValidationError(issues);
}

export function assertEffectiveEntitlements(value: unknown): asserts value is EffectiveEntitlements {
  const contract = value as Partial<EffectiveEntitlements> | null;
  const issues: string[] = [];
  rejectUnknownKeys(contract, [
    'tenantId', 'subscriptionStatus', 'products', 'version', 'effectiveAt',
  ], issues);
  if (!contract?.tenantId || !UUID_PATTERN.test(contract.tenantId)) issues.push('invalid tenantId');
  if (!Array.isArray(contract?.products)) issues.push('products must be an array');
  if (!contract?.subscriptionStatus || !SUBSCRIPTION_STATUSES.has(contract.subscriptionStatus)) {
    issues.push('invalid subscriptionStatus');
  }
  for (const product of contract?.products ?? []) {
    rejectUnknownKeys(product, ['key', 'active', 'capabilities', 'limits'], issues);
    if (!PRODUCT_KEYS.has(product.key)) issues.push('unknown product key');
    if (Object.keys(product.capabilities).some((key) => !KEY_PATTERN.test(key))) {
      issues.push('invalid capability key');
    }
    if (PRODUCT_KEYS.has(product.key)) {
      rejectUnknownCapabilities(product.key, Object.keys(product.capabilities), issues);
    }
  }
  if (!Number.isInteger(contract?.version) || (contract?.version ?? -1) < 0) issues.push('invalid version');
  if (!contract?.effectiveAt || Number.isNaN(Date.parse(contract.effectiveAt))) issues.push('invalid effectiveAt');
  if (issues.length) throw new ContractValidationError(issues);
}

export function assertProductIdentityStatus(
  value: unknown,
): asserts value is ProductIdentityStatus {
  const status = value as Partial<ProductIdentityStatus> | null;
  const issues: string[] = [];
  rejectUnknownKeys(status, [
    'tenantId',
    'userId',
    'membershipId',
    'tenantStatus',
    'userStatus',
    'membershipStatus',
    'effectiveAt',
  ], issues);
  for (const key of ['tenantId', 'userId', 'membershipId'] as const) {
    if (!status?.[key] || !UUID_PATTERN.test(status[key]!)) {
      issues.push(`invalid ${key}`);
    }
  }
  for (const key of [
    'tenantStatus',
    'userStatus',
    'membershipStatus',
  ] as const) {
    if (!status?.[key] || !IDENTITY_STATUSES.has(status[key]!)) {
      issues.push(`invalid ${key}`);
    }
  }
  if (!status?.effectiveAt || Number.isNaN(Date.parse(status.effectiveAt))) {
    issues.push('invalid effectiveAt');
  }
  if (issues.length) throw new ContractValidationError(issues);
}

export function assertProductEvent(value: unknown): asserts value is ProductEventEnvelope {
  const event = value as Partial<ProductEventEnvelope> | null;
  const issues: string[] = [];
  rejectUnknownKeys(event, [
    'eventId', 'eventType', 'occurredAt', 'producer', 'tenantId', 'actorId',
    'correlationId', 'schemaVersion', 'payload',
  ], issues);
  for (const key of ['eventId', 'tenantId', 'correlationId'] as const) {
    if (!event?.[key] || !UUID_PATTERN.test(event[key]!)) issues.push(`invalid ${key}`);
  }
  if (!event?.eventType?.match(/\.v\d+$/)) issues.push('eventType must be versioned');
  if (!event?.occurredAt || Number.isNaN(Date.parse(event.occurredAt))) issues.push('invalid occurredAt');
  if (!Number.isInteger(event?.schemaVersion) || (event?.schemaVersion ?? 0) < 1) issues.push('invalid schemaVersion');
  if (issues.length) throw new ContractValidationError(issues);
}
