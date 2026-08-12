import { Injectable, NotFoundException } from '@nestjs/common';
import { PlatformDatabaseService } from '../../shared/database/platform-database.service';
import { ProductRegistryService } from './product-registry.service';

@Injectable()
export class ProductHealthService {
  constructor(
    private readonly database: PlatformDatabaseService,
    private readonly registry: ProductRegistryService,
  ) {}

  async check(
    productKey: string,
    environment = process.env.DEPLOYMENT_ENVIRONMENT ?? 'development',
  ) {
    const product = await this.registry.active(productKey);
    const deployment = product.deployments.find(
      (item) => item.environment === environment,
    );
    if (!deployment) {
      throw new NotFoundException({
        code: 'PRODUCT_DEPLOYMENT_NOT_FOUND',
        message: `${productKey} has no approved ${environment} deployment`,
      });
    }
    const manifest = product.manifest;
    const [liveness, readiness] = await Promise.all([
      this.probe(deployment.internalApiBaseUrl, manifest.health.livenessPath),
      this.probe(deployment.internalApiBaseUrl, manifest.health.readinessPath),
    ]);
    const health =
      liveness.ok && readiness.ok
        ? 'HEALTHY'
        : liveness.ok
          ? 'DEGRADED'
          : 'UNHEALTHY';
    await this.database.transaction((tx) =>
      tx.productDeployment.update({
        where: { id: deployment.id },
        data: {
          health,
          lastHealthCheckAt: new Date(),
          lastHealthMessage: `${liveness.status}/${readiness.status}`,
          version: { increment: 1 },
        },
      }),
    );
    return {
      productKey: product.productKey,
      environment,
      health,
      liveness,
      readiness,
    };
  }

  private async probe(baseUrl: string, path: string) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      Number(process.env.PRODUCT_HEALTH_TIMEOUT_MS ?? 3000),
    );
    try {
      const response = await fetch(
        new URL(path, `${baseUrl.replace(/\/$/, '')}/`),
        {
          signal: controller.signal,
          redirect: 'error',
          headers: { accept: 'application/json' },
        },
      );
      return { ok: response.ok, status: response.status };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
