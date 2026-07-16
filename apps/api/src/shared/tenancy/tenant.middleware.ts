import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../database/prisma.service';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContextService: TenantContextService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const tenantIdHeader = req.headers['x-tenant-id'] as string;
    const workspaceHeader = req.headers['x-workspace-subdomain'] as string;
    const requestContext = {
      requestId: String(req.headers['x-request-id'] ?? ''),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    };

    if (!tenantIdHeader && !workspaceHeader) {
      // In a real app, you might want to allow some endpoints without a tenant context (like system health, global admin login, etc.)
      // For now, if no tenant is provided, we just proceed with no tenant context. RLS will fail-closed and return 0 rows for tenant-bound data.
      return TenantContextService.run(
        { tenantId: '', ...requestContext },
        next,
      );
    }

    const tenant = await this.prisma.forAdmin((tx) =>
      tenantIdHeader
        ? tx.tenant.findUnique({
            where: { id: tenantIdHeader },
          })
        : tx.tenant.findUnique({
            where: { subdomain: workspaceHeader },
          }),
    );

    if (!tenant) {
      throw new UnauthorizedException('Workspace not found');
    }

    if (tenant.status === 'SUSPENDED') {
      throw new ForbiddenException(
        'Tenant is suspended. Please contact billing.',
      );
    }

    TenantContextService.run(
      {
        tenantId: tenant.id,
        ...requestContext,
      },
      next,
    );
  }
}
