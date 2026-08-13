import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../shared/http/authenticated-user';
import type {
  ProductReadinessPort,
  ProductSetupHealth,
} from '../../shared/products/product-readiness.port';
import { ProductIntegrationService } from './product-integration.service';
import { ProductRegistryService } from './product-registry.service';

@Injectable()
export class ProductReadinessAdapter implements ProductReadinessPort {
  constructor(
    private readonly integration: ProductIntegrationService,
    private readonly registry: ProductRegistryService,
  ) {}

  async getSetupHealth(
    user: AuthenticatedUser,
    productKey: string,
  ): Promise<ProductSetupHealth> {
    const registered = await this.registry.active(productKey);
    const productToken = await this.integration.issueToken(user, {
      productKey: registered.productKey,
    });
    const environment =
      process.env.DEPLOYMENT_ENVIRONMENT ??
      (process.env.NODE_ENV === 'production' ? 'production' : 'development');
    const deployment = registered.deployments.find(
      (candidate) => candidate.environment === environment,
    );
    if (!deployment) this.unavailable();

    const apiPrefix = registered.manifest.routes.apiPrefix.replace(/\/+$/u, '');
    const baseUrl = deployment.internalApiBaseUrl.replace(/\/+$/u, '');
    let response: Response;
    try {
      response = await fetch(
        `${baseUrl}${apiPrefix}/workspace/settings/health`,
        {
          headers: { Authorization: `Bearer ${productToken.accessToken}` },
          signal: AbortSignal.timeout(5_000),
        },
      );
    } catch {
      this.unavailable();
    }
    if (!response.ok) this.unavailable();

    const payload = (await response.json()) as {
      data?: ProductSetupHealth;
    };
    return { categories: payload.data?.categories ?? [] };
  }

  private unavailable(): never {
    throw new ServiceUnavailableException({
      code: 'PRODUCT_READINESS_UNAVAILABLE',
      message: 'Product setup readiness is temporarily unavailable',
    });
  }
}
