import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DeletionJobStatus,
  Prisma,
  TenantStatus,
} from '../../../generated/platform-client';
import type { AuthenticatedPlatformUser } from '../platform-auth/platform-auth.types';
import {
  PlatformDatabaseService,
  type PlatformTransaction,
} from '../platform-auth/platform-database.service';
import type { ScheduleTenantDeletionDto } from './dto/platform-tenant.dto';

type RequestMetadata = {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
};

const ACTIVE_STATUSES = [
  DeletionJobStatus.PENDING,
  DeletionJobStatus.RUNNING,
  DeletionJobStatus.LEGAL_HOLD,
];

@Injectable()
export class TenantDeletionService {
  constructor(private readonly database: PlatformDatabaseService) {}

  latest(tenantId: string) {
    return this.database.transaction(async (tx) => {
      await this.requireTenant(tx, tenantId);
      return {
        data: await tx.tenantDeletionJob.findFirst({
          where: { tenantId },
          orderBy: { createdAt: 'desc' },
        }),
      };
    });
  }

  schedule(
    tenantId: string,
    dto: ScheduleTenantDeletionDto,
    actor: AuthenticatedPlatformUser,
    metadata: RequestMetadata,
  ) {
    return this.database.transaction(async (tx) => {
      const tenant = await this.requireTenant(tx, tenantId);
      if (tenant.status === TenantStatus.CHURNED) {
        throw new ConflictException({
          code: 'TENANT_ALREADY_DELETED',
          message: 'This tenant has already completed deletion',
        });
      }
      const existing = await tx.tenantDeletionJob.findFirst({
        where: { tenantId, status: { in: ACTIVE_STATUSES } },
        orderBy: { createdAt: 'desc' },
      });
      if (existing) return { data: existing, replayed: true };

      const legalHoldUntil = dto.legalHoldUntil
        ? new Date(dto.legalHoldUntil)
        : null;
      const status =
        legalHoldUntil && legalHoldUntil > new Date()
          ? DeletionJobStatus.LEGAL_HOLD
          : DeletionJobStatus.PENDING;
      const users = await tx.user.findMany({
        where: { tenantId },
        select: { id: true },
      });
      await tx.refreshToken.updateMany({
        where: {
          userId: { in: users.map(({ id }) => id) },
          revokedAt: null,
        },
        data: { revokedAt: new Date(), revokedReason: 'ADMIN' },
      });
      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          status: TenantStatus.SUSPENDED,
          suspendedAt: new Date(),
          suspendedReason: 'Tenant deletion scheduled',
          suspendedByPlatformUserId: actor.platformUserId,
        },
      });
      const job = await tx.tenantDeletionJob.create({
        data: {
          tenantId,
          requestedBy: actor.platformUserId,
          reason: dto.reason.trim(),
          legalHoldUntil,
          status,
          evidence: {
            policy: 'DELTCRM_TENANT_DELETION_V2',
            accessRevokedAt: new Date().toISOString(),
            productPurgeState: 'REQUESTED',
          },
        },
      });
      await this.requestProductDeletion(
        tx,
        tenantId,
        job.id,
        actor.platformUserId,
      );
      await this.audit(tx, actor, metadata, tenantId, 'scheduled', {
        deletionJobId: job.id,
        legalHoldUntil,
        reason: dto.reason.trim(),
      });
      return { data: job, replayed: false };
    });
  }

  retry(
    tenantId: string,
    jobId: string,
    reason: string,
    actor: AuthenticatedPlatformUser,
    metadata: RequestMetadata,
  ) {
    return this.database.transaction(async (tx) => {
      const job = await tx.tenantDeletionJob.findFirst({
        where: { id: jobId, tenantId },
      });
      if (!job) this.notFound('Tenant deletion job');
      if (job.status !== DeletionJobStatus.FAILED) {
        throw new ConflictException({
          code: 'TENANT_DELETION_NOT_RETRYABLE',
          message: 'Only failed tenant deletion jobs can be retried',
        });
      }
      const updated = await tx.tenantDeletionJob.update({
        where: { id: jobId },
        data: {
          status: DeletionJobStatus.PENDING,
          failureCode: null,
          evidence: mergeEvidence(job.evidence, {
            retryRequestedAt: new Date().toISOString(),
            retryReason: reason.trim(),
            productPurgeState: 'REQUESTED',
          }),
        },
      });
      await this.requestProductDeletion(
        tx,
        tenantId,
        jobId,
        actor.platformUserId,
      );
      await this.audit(tx, actor, metadata, tenantId, 'retry_requested', {
        deletionJobId: jobId,
        reason: reason.trim(),
      });
      return { data: updated };
    });
  }

  private requestProductDeletion(
    tx: PlatformTransaction,
    tenantId: string,
    deletionJobId: string,
    requestedBy: string,
  ) {
    return tx.outboxEvent.create({
      data: {
        tenantId,
        eventKey: 'platform.product.deletion-requested.v1',
        payload: {
          productKey: 'HRMS',
          deletionJobId,
          requestedBy,
        },
      },
    });
  }

  private async requireTenant(tx: PlatformTransaction, tenantId: string) {
    const tenant = await tx.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) this.notFound('Tenant');
    return tenant;
  }

  private audit(
    tx: PlatformTransaction,
    actor: AuthenticatedPlatformUser,
    metadata: RequestMetadata,
    tenantId: string,
    action: string,
    value: Prisma.InputJsonValue,
  ) {
    return tx.systemAuditLog.create({
      data: {
        actorPlatformUserId: actor.platformUserId,
        tenantId,
        action: `platform.tenant.deletion_${action}`,
        module: 'platform.tenants',
        newValue: value,
        ipAddress: metadata.ipAddress ?? null,
        userAgent: metadata.userAgent ?? null,
        requestId: metadata.requestId ?? null,
      },
    });
  }

  private notFound(resource: string): never {
    throw new NotFoundException({
      code: `${resource.toUpperCase().replaceAll(' ', '_')}_NOT_FOUND`,
      message: `${resource} was not found`,
    });
  }
}

function mergeEvidence(
  current: Prisma.JsonValue | null,
  next: Record<string, Prisma.JsonValue>,
): Prisma.InputJsonObject {
  const base =
    current && typeof current === 'object' && !Array.isArray(current)
      ? current
      : {};
  return { ...base, ...next };
}
