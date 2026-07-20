import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { TenantContextService } from '../../shared/tenancy/tenant-context.service';
import { ListTenantAuditQueryDto } from './dto/list-tenant-audit-query.dto';

@Injectable()
export class TenantAuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: TenantContextService,
  ) {}

  async list(query: ListTenantAuditQueryDto) {
    const tenantId = this.requireTenantId();
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const search = query.search?.trim();
    const where: Prisma.TenantAuditLogWhereInput = {
      tenantId,
      module: query.module?.trim() || undefined,
      action: query.action?.trim()
        ? { contains: query.action.trim(), mode: 'insensitive' }
        : undefined,
      entityType: query.entityType?.trim() || undefined,
      entityId: query.entityId,
      actorUserId: query.actorUserId,
      createdAt:
        query.from || query.to
          ? {
              gte: query.from ? new Date(query.from) : undefined,
              lte: query.to ? endOfDay(query.to) : undefined,
            }
          : undefined,
      ...(search
        ? {
            OR: [
              { action: { contains: search, mode: 'insensitive' } },
              { module: { contains: search, mode: 'insensitive' } },
              { entityType: { contains: search, mode: 'insensitive' } },
              { requestId: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return this.prisma.forTenant(async (tx) => {
      const [records, total] = await Promise.all([
        tx.tenantAuditLog.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
        }),
        tx.tenantAuditLog.count({ where }),
      ]);
      const actorIds = [
        ...new Set(
          records
            .map(({ actorUserId }) => actorUserId)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      const actors = actorIds.length
        ? await tx.user.findMany({
            where: { tenantId, id: { in: actorIds } },
            select: { id: true, email: true, status: true },
          })
        : [];
      const actorById = new Map(actors.map((actor) => [actor.id, actor]));

      return {
        data: records.map((record) => ({
          ...record,
          actor: record.actorUserId
            ? (actorById.get(record.actorUserId) ?? null)
            : null,
          impersonated: Boolean(record.impersonationSessionId),
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        },
      };
    });
  }

  private requireTenantId() {
    const tenantId = this.context.tenantId;
    if (!tenantId) throw new Error('Tenant context is unavailable');
    return tenantId;
  }
}

function endOfDay(value: string) {
  const date = new Date(value);
  date.setUTCHours(23, 59, 59, 999);
  return date;
}
