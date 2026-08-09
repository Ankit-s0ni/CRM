import { Inject, Injectable } from '@nestjs/common';
import {
  PRODUCT_PLATFORM_PORT,
  type ProductPlatformPort,
} from '@deltcrm/product-contracts';

@Injectable()
export class HrmsPlatformContractAdapter {
  constructor(
    @Inject(PRODUCT_PLATFORM_PORT)
    private readonly platform: ProductPlatformPort,
  ) {}

  async context(tenantId: string) {
    const [entitlements, provisioning] = await Promise.all([
      this.platform.getEntitlements(tenantId),
      this.platform.getProvisioningStatus(tenantId, 'HRMS'),
    ]);

    return { entitlements, provisioning };
  }
}
