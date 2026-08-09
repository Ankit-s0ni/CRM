import type {
  EffectiveEntitlements,
  NavigationContract,
  ProductAudience,
  ProductKey,
  ProductIdentityStatus,
  ProductManifest,
  ProductProvisioningStatus,
  ProductTokenResponse,
} from '../src/contracts';

export interface ProductIntegrationClientOptions {
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
  getAccessToken?: () => string | undefined | Promise<string | undefined>;
  getCorrelationContext?: () =>
    | ProductCorrelationContext
    | Promise<ProductCorrelationContext>;
  serviceProductKey?: ProductKey;
  serviceKey?: string;
}

export interface ProductCorrelationContext {
  requestId?: string;
  traceId?: string;
  traceparent?: string;
}

export class ProductIntegrationClient {
  private readonly fetcher: typeof globalThis.fetch;

  constructor(private readonly options: ProductIntegrationClientOptions) {
    this.fetcher = options.fetch ?? globalThis.fetch;
  }

  issueToken(audience: ProductAudience, requestId?: string) {
    return this.request<ProductTokenResponse>('/product-integration/token', {
      method: 'POST',
      body: JSON.stringify({ audience }),
      requestId,
    });
  }

  entitlements() {
    return this.request<EffectiveEntitlements>('/product-integration/entitlements');
  }

  navigation() {
    return this.request<NavigationContract>('/product-integration/navigation');
  }

  manifest(productKey: string) {
    return this.request<ProductManifest>(
      `/internal/v1/products/${encodeURIComponent(productKey)}/manifest`,
      { serviceRequest: true },
    );
  }

  tenantEntitlements(tenantId: string) {
    return this.request<EffectiveEntitlements>(
      `/internal/v1/tenants/${encodeURIComponent(tenantId)}/entitlements`,
      { serviceRequest: true },
    );
  }

  identityStatus(tenantId: string, userId: string, membershipId: string) {
    const query = new URLSearchParams({ membershipId });
    return this.request<ProductIdentityStatus>(
      `/internal/v1/tenants/${encodeURIComponent(tenantId)}/users/${encodeURIComponent(userId)}/identity-status?${query.toString()}`,
      { serviceRequest: true },
    );
  }

  provisioningStatus(tenantId: string, productKey: string) {
    return this.request<ProductProvisioningStatus>(
      `/internal/v1/tenants/${encodeURIComponent(tenantId)}/products/${encodeURIComponent(productKey)}/status`,
      { serviceRequest: true },
    );
  }

  private async request<T>(
    path: string,
    init: RequestInit & { requestId?: string; serviceRequest?: boolean } = {},
  ): Promise<T> {
    const [accessToken, correlation] = await Promise.all([
      this.options.getAccessToken?.(),
      this.options.getCorrelationContext?.(),
    ]);
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    if (init.body) headers.set('Content-Type', 'application/json');
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    if (!headers.has('X-Request-Id') && correlation?.requestId) {
      headers.set('X-Request-Id', correlation.requestId);
    }
    if (!headers.has('X-Trace-Id') && correlation?.traceId) {
      headers.set('X-Trace-Id', correlation.traceId);
    }
    if (!headers.has('traceparent') && correlation?.traceparent) {
      headers.set('traceparent', correlation.traceparent);
    }
    if (init.requestId) headers.set('X-Request-Id', init.requestId);
    if (init.serviceRequest && this.options.serviceKey) {
      headers.set('X-Product-Service-Key', this.options.serviceKey);
    }
    if (init.serviceRequest && this.options.serviceProductKey) {
      headers.set('X-Product-Key', this.options.serviceProductKey);
    }

    const response = await this.fetcher(
      `${this.options.baseUrl.replace(/\/$/, '')}${path}`,
      { ...init, headers },
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        code: 'CONTRACT_REQUEST_FAILED',
        message: response.statusText,
      }));
      throw Object.assign(new Error(error.message), error, {
        statusCode: response.status,
      });
    }
    return response.json() as Promise<T>;
  }
}
