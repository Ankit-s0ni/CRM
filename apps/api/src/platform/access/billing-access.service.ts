import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { TenantContextService } from '../tenancy/public';

@Injectable()
export class BillingAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async subscription() {
    const tenantId = this.tenantContextService.tenantId ?? '';
    const subscription = await this.prisma.forTenant((tx) =>
      tx.tenantSubscription.findFirst({
        where: {
          tenantId,
          status: { in: ['TRIALING', 'ACTIVE', 'PAST_DUE'] },
        },
        include: { plan: true },
        orderBy: { updatedAt: 'desc' },
      }),
    );
    if (!subscription) {
      throw new NotFoundException({
        code: 'SUBSCRIPTION_NOT_FOUND',
        message: 'Current subscription not found',
      });
    }
    return { data: subscription };
  }
}
