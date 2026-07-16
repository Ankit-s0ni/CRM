import { Injectable } from '@nestjs/common';
import { TenantStatus } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';

@Injectable()
export class WorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus(identifier: { tenantId?: string; subdomain?: string }) {
    const tenant = await this.prisma.forAdmin((tx) =>
      identifier.tenantId
        ? tx.tenant.findUnique({ where: { id: identifier.tenantId } })
        : tx.tenant.findUnique({
            where: {
              subdomain: identifier.subdomain?.trim().toLowerCase() ?? '',
            },
          }),
    );

    if (!tenant) {
      return {
        available: false,
        status: 'NOT_FOUND',
        errorCode: 'WORKSPACE_NOT_FOUND',
      };
    }

    const available =
      tenant.status === TenantStatus.TRIAL ||
      tenant.status === TenantStatus.ACTIVE;

    return {
      available,
      status: tenant.status,
      errorCode: available ? null : this.statusErrorCode(tenant.status),
      workspace: {
        id: tenant.id,
        companyName: tenant.companyName,
        subdomain: tenant.subdomain,
        logoUrl: tenant.companyLogo,
      },
      unavailableReason: available ? null : tenant.suspendedReason,
    };
  }

  async getModules(tenantId: string) {
    const tenantModules = await this.prisma.forAdmin((tx) =>
      tx.tenantModule.findMany({
        where: { tenantId, isActive: true },
        include: { module: true },
        orderBy: { module: { name: 'asc' } },
      }),
    );

    return {
      modules: tenantModules.map(({ module, activatedAt }) => ({
        key: module.key,
        name: module.name,
        activatedAt,
      })),
    };
  }

  private statusErrorCode(status: TenantStatus) {
    if (status === TenantStatus.SUSPENDED) {
      return 'TENANT_SUSPENDED';
    }

    if (status === TenantStatus.CHURNED) {
      return 'TENANT_CHURNED';
    }

    return 'WORKSPACE_UNAVAILABLE';
  }
}
