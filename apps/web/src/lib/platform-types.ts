export type PlatformUser = {
  id: string;
  email: string;
  role: "SUPER_ADMIN" | "SUPPORT";
  permissions: string[];
};

export type PlatformSessionResponse = {
  accessToken: string;
  refreshToken: string;
  user: PlatformUser;
  session: { id: string; mfaVerifiedAt: string };
};

export type SubscriptionPlan = {
  id: string;
  name: string;
  pricePerUser: string;
  currency: string;
  maxEmployees: number;
  billingPeriod: "MONTHLY" | "YEARLY";
};

export type PlatformModule = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  icon: string | null;
  availability: "AVAILABLE" | "COMING_SOON" | "DEPRECATED";
  dependencyKeys: string[];
  conflictKeys: string[];
  kind: "PRODUCT" | "ADD_ON";
  parentModuleId: string | null;
  catalogOrder: number;
  customerVisible: boolean;
  capabilities?: PlatformCapability[];
  addOns?: PlatformModule[];
  tenantModules?: { tenantId: string }[];
  isActive?: boolean;
};

export type PlatformCapability = {
  id: string;
  moduleId: string;
  key: string;
  name: string;
  description: string | null;
  availability: "AVAILABLE" | "COMING_SOON" | "DEPRECATED";
  isCore: boolean;
  configurable: boolean;
  requiredModuleKeys: string[];
  dependencyKeys: string[];
  conflictKeys: string[];
  displayOrder: number;
};

export type TenantListItem = {
  id: string;
  companyName: string;
  subdomain: string;
  status: "TRIAL" | "ACTIVE" | "SUSPENDED" | "CHURNED";
  createdAt: string;
  employees: number;
  subscription: null | {
    status: "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELLED";
    seatCount: number;
    plan: SubscriptionPlan;
  };
  modules: { key: string; name: string }[];
};

export type TenantDetail = {
  tenant: TenantListItem & {
    settings: null | { timezone: string };
    suspendedAt?: string | null;
    suspendedReason?: string | null;
  };
  subscription:
    | null
    | (TenantListItem["subscription"] extends infer S
        ? Exclude<S, null> & { currentPeriodEnd: string }
        : never);
  usage: { employees: number; seats: number; percentage: number };
  modules: {
    key: string;
    name: string;
    isActive: boolean;
    activatedAt: string | null;
  }[];
  administratorInvitation: null | {
    email: string;
    expiresAt: string;
    consumedAt: string | null;
  };
  primaryAdministrator: null | {
    id: string;
    email: string;
    status: string;
    emailVerifiedAt: string | null;
    lastLoginAt: string | null;
  };
};

export type TenantEntitlements = {
  plan: { id: string; name: string } | null;
  products: Array<{
    key: string;
    name: string;
    kind: "PRODUCT" | "ADD_ON";
    active: boolean;
    source: "PLAN" | "OVERRIDE";
  }>;
  capabilities: Array<
    PlatformCapability & {
      included: boolean;
      source: "PLAN" | "OVERRIDE" | "NONE";
      override: null | {
        mode: "ENABLE" | "DISABLE";
        reason: string;
        startsAt: string | null;
        endsAt: string | null;
      };
    }
  >;
  overrides: Array<{
    capability: PlatformCapability;
    mode: "ENABLE" | "DISABLE";
    reason: string;
    startsAt: string | null;
    endsAt: string | null;
  }>;
  limits: { employees: number };
};

export type PlatformDashboardData = {
  metrics: {
    tenants: number;
    activeTenants: number;
    suspendedTenants: number;
    employees: number;
    projectedMrr: number;
    currency: string;
    failedPayments: number;
  };
  planMix: { planId: string; name: string; tenants: number }[];
  recentTenants: Array<{
    id: string;
    companyName: string;
    subdomain: string;
    status: TenantListItem["status"];
    createdAt: string;
    plan: string | null;
    subscriptionStatus: string | null;
  }>;
};

export type SystemAuditLog = {
  id: string;
  actorPlatformUserId: string | null;
  impersonationSessionId: string | null;
  tenantId: string | null;
  action: string;
  module: string;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  createdAt: string;
  actor: { id: string; email: string } | null;
  tenant: { id: string; companyName: string; subdomain: string } | null;
};

export type SystemAlert = {
  id: string;
  alertType: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  title: string;
  payload: unknown;
  tenantId: string | null;
  status: "OPEN" | "ACKNOWLEDGED" | "RESOLVED" | "DISMISSED";
  acknowledgedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

export type PlatformHealth = {
  status: "healthy" | "degraded";
  checkedAt: string;
  services: Record<
    string,
    {
      status: "up" | "down" | "degraded";
      latencyMs?: number;
      pending?: number;
      deadLettered?: number;
    }
  >;
};
