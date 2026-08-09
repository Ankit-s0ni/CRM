export const PRODUCT_CONTRACT_VERSION = '1.0' as const;

export type ProductKey = 'HRMS' | 'MAIL' | 'POS';
export type ProductAudience = 'hrms-api' | 'mail-api' | 'pos-api';
export type LocaleCode = 'en' | 'ar';

export interface StableIdentifiers {
  tenantId: string;
  userId: string;
  membershipId: string;
}

export type ProductIdentityLifecycleStatus =
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'UNAVAILABLE';

export interface ProductIdentityStatus extends StableIdentifiers {
  tenantStatus: ProductIdentityLifecycleStatus;
  userStatus: ProductIdentityLifecycleStatus;
  membershipStatus: ProductIdentityLifecycleStatus;
  effectiveAt: string;
}

export interface ProductManifest {
  contractVersion: typeof PRODUCT_CONTRACT_VERSION;
  key: ProductKey;
  name: string;
  version: string;
  frontendPathTemplate: `/{locale}/app/${Lowercase<ProductKey>}`;
  apiPath: `/api/${Lowercase<ProductKey>}`;
  healthEndpoint: '/healthz';
  readinessEndpoint: '/readyz';
  permissions: readonly string[];
  capabilities: readonly string[];
  eventsConsumed: readonly string[];
  eventsPublished: readonly string[];
}

export interface ProductTokenClaims extends StableIdentifiers {
  sub: string;
  roles: string[];
  products: ProductKey[];
  capabilities: string[];
  permissions: string[];
  locale: LocaleCode;
  entitlementVersion: number;
  iss: string;
  aud: ProductAudience;
  iat: number;
  exp: number;
  jti: string;
}

export type SubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'SUSPENDED'
  | 'CANCELED'
  | 'NONE';

export interface ProductEntitlement {
  key: ProductKey;
  active: boolean;
  capabilities: Record<string, boolean>;
  limits: Record<string, number>;
}

export interface EffectiveEntitlements {
  tenantId: string;
  subscriptionStatus: SubscriptionStatus;
  products: ProductEntitlement[];
  version: number;
  effectiveAt: string;
}

export interface NavigationItem {
  key: string;
  hrefTemplate: `/{locale}/app${string}`;
  requiredProduct?: ProductKey;
  requiredCapability?: string;
  requiredPermission?: string;
}

export interface NavigationContract {
  items: NavigationItem[];
}

export interface ContractErrorEnvelope {
  statusCode: number;
  code: string;
  message: string;
  requestId: string;
  timestamp: string;
}

export interface ProductEventEnvelope<TPayload = Record<string, unknown>> {
  eventId: string;
  eventType: `${string}.v${number}`;
  occurredAt: string;
  producer: 'PLATFORM' | ProductKey;
  tenantId: string;
  actorId?: string;
  correlationId: string;
  schemaVersion: number;
  payload: TPayload;
}

export type ProvisioningState =
  | 'NOT_REQUESTED'
  | 'PENDING'
  | 'PROVISIONING'
  | 'ACTIVE'
  | 'FAILED'
  | 'SUSPENDED';

export interface ProductProvisioningStatus {
  tenantId: string;
  productKey: ProductKey;
  state: ProvisioningState;
  attempt: number;
  updatedAt: string;
  failureCode?: string;
}

export type ProductLifecycleEventType =
  | 'platform.product.activation-requested.v1'
  | 'platform.product.suspension-requested.v1';

export interface ProductLifecyclePayload {
  productKey: ProductKey;
  entitlementVersion: number;
  requestedBy: string;
}

export type ProductLifecycleEvent = ProductEventEnvelope<ProductLifecyclePayload> & {
  eventType: ProductLifecycleEventType;
  producer: 'PLATFORM';
};

export interface ProductTokenRequest {
  audience: ProductAudience;
}

export interface ProductTokenResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

export interface ProductPlatformPort {
  getIdentityStatus(
    identity: StableIdentifiers,
  ): Promise<ProductIdentityStatus>;
  getEntitlements(tenantId: string): Promise<EffectiveEntitlements>;
  getProvisioningStatus(
    tenantId: string,
    productKey: ProductKey,
  ): Promise<ProductProvisioningStatus>;
}

export const PRODUCT_PLATFORM_PORT = Symbol.for(
  '@deltcrm/product-contracts/ProductPlatformPort',
);

export const PRODUCT_TOKEN_VERIFICATION_KEY = Symbol.for(
  '@deltcrm/product-contracts/ProductTokenVerificationKey',
);

export interface ProductTokenVerificationKey {
  issuer: string;
  publicKey: string;
}
