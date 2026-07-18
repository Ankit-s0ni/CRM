import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DeletionJobStatus,
  DeviceStatus,
  EmployeeStatus,
  FaceEnrollmentStatus,
  PaymentMethodStatus,
  Prisma,
  SubscriptionStatus,
  TenantStatus,
  UserStatus,
} from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { PrivateEvidenceStorageService } from '../../biometrics/private-evidence-storage.service';
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
  constructor(
    private readonly database: PlatformDatabaseService,
    private readonly storage: PrivateEvidenceStorageService,
  ) {}

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
            policy: 'DELTCRM_TENANT_DELETION_V1',
            accessRevokedAt: new Date().toISOString(),
            billingAndAuditRetention: true,
          },
        },
      });
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
          }),
        },
      });
      await this.audit(tx, actor, metadata, tenantId, 'retry_requested', {
        deletionJobId: jobId,
        reason: reason.trim(),
      });
      return { data: updated };
    });
  }

  async processNext() {
    const job = await this.claimNext();
    if (!job) return null;
    try {
      const enrollments = await this.database.transaction((tx) =>
        tx.faceEnrollment.findMany({
          where: { tenantId: job.tenantId },
          select: { id: true, employeeId: true, privateObjectKey: true },
        }),
      );
      await Promise.all(
        enrollments.map((enrollment) =>
          this.storage.deleteEnrollmentObject(
            job.tenantId,
            enrollment.employeeId,
            enrollment.privateObjectKey,
          ),
        ),
      );
      return await this.complete(job.id, job.tenantId, enrollments.length);
    } catch (error) {
      const failureCode = safeFailureCode(error);
      await this.database.transaction((tx) =>
        tx.tenantDeletionJob.update({
          where: { id: job.id },
          data: {
            status: DeletionJobStatus.FAILED,
            failureCode,
            evidence: mergeEvidence(job.evidence, {
              failedAt: new Date().toISOString(),
              failureCode,
            }),
          },
        }),
      );
      throw error;
    }
  }

  private claimNext() {
    const now = new Date();
    return this.database.transaction(async (tx) => {
      const candidate = await tx.tenantDeletionJob.findFirst({
        where: {
          status: {
            in: [DeletionJobStatus.PENDING, DeletionJobStatus.LEGAL_HOLD],
          },
          OR: [{ legalHoldUntil: null }, { legalHoldUntil: { lte: now } }],
        },
        orderBy: { createdAt: 'asc' },
      });
      if (!candidate) return null;
      const claimed = await tx.tenantDeletionJob.updateMany({
        where: { id: candidate.id, status: candidate.status },
        data: {
          status: DeletionJobStatus.RUNNING,
          failureCode: null,
          evidence: mergeEvidence(candidate.evidence, {
            startedAt: now.toISOString(),
          }),
        },
      });
      if (claimed.count !== 1) return null;
      return tx.tenantDeletionJob.findUnique({ where: { id: candidate.id } });
    });
  }

  private complete(jobId: string, tenantId: string, biometricObjects: number) {
    return this.database.transaction(async (tx) => {
      const [users, employees, enrollments] = await Promise.all([
        tx.user.findMany({ where: { tenantId }, select: { id: true } }),
        tx.employee.findMany({ where: { tenantId }, select: { id: true } }),
        tx.faceEnrollment.findMany({
          where: { tenantId },
          select: { id: true },
        }),
      ]);
      const now = new Date();

      await tx.verificationToken.deleteMany({ where: { tenantId } });
      await tx.refreshToken.deleteMany({
        where: { userId: { in: users.map(({ id }) => id) } },
      });
      await tx.deviceIntegrityChallenge.deleteMany({ where: { tenantId } });
      await tx.fieldLocationPing.deleteMany({ where: { tenantId } });
      await tx.fieldPingReceipt.deleteMany({ where: { tenantId } });
      await tx.fieldRouteSummary.deleteMany({ where: { tenantId } });
      await tx.registeredDevice.updateMany({
        where: { tenantId },
        data: {
          status: DeviceStatus.BLOCKED,
          pushToken: null,
          lastIp: null,
          blockedReason: 'Tenant deletion completed',
        },
      });
      await tx.attendanceVerificationLog.updateMany({
        where: { tenantId },
        data: {
          selfieKey: null,
          faceMatchScore: null,
          livenessOk: null,
          observedIp: null,
          userAgent: null,
        },
      });
      await tx.attendanceEvent.updateMany({
        where: { tenantId },
        data: {
          latitude: null,
          longitude: null,
          ipAddress: null,
          userAgent: null,
        },
      });
      await tx.biometricConsent.updateMany({
        where: { tenantId },
        data: {
          action: 'WITHDRAWN',
          revokedAt: now,
          consentIp: null,
          consentUserAgent: null,
        },
      });
      for (const enrollment of enrollments) {
        await tx.faceEnrollment.update({
          where: { id: enrollment.id },
          data: {
            status: FaceEnrollmentStatus.REVOKED,
            revokedAt: now,
            privateObjectKey: `purged/${enrollment.id}`,
            embeddingRef: `purged/${enrollment.id}`,
            livenessProvider: 'PURGED',
          },
        });
      }
      for (const employee of employees) {
        await tx.employee.update({
          where: { id: employee.id },
          data: {
            fullName: `Deleted employee ${employee.id.slice(0, 8)}`,
            phone: null,
            status: EmployeeStatus.TERMINATED,
            dateOfExit: now,
            masterSelfie: null,
            faceEmbeddingRef: null,
            faceEnrolledAt: null,
            faceEnrolledBy: null,
          },
        });
      }
      for (const user of users) {
        await tx.user.update({
          where: { id: user.id },
          data: {
            email: `deleted+${user.id}@invalid.deltcrm`,
            phone: null,
            passwordHash: randomBytes(48).toString('hex'),
            status: UserStatus.DISABLED,
            mfaSecret: null,
            mfaEnabled: false,
            lastLoginIp: null,
          },
        });
      }
      const methods = await tx.billingPaymentMethod.findMany({
        where: { tenantId },
        select: { id: true },
      });
      for (const method of methods) {
        await tx.billingPaymentMethod.update({
          where: { id: method.id },
          data: {
            providerMethodRef: `purged-${method.id}`,
            displayName: 'Deleted payment method',
            lastFour: null,
            expiryMonth: null,
            expiryYear: null,
            isDefault: false,
            status: PaymentMethodStatus.REVOKED,
          },
        });
      }
      await tx.tenantSubscription.updateMany({
        where: { tenantId },
        data: {
          status: SubscriptionStatus.CANCELLED,
          cancelAtPeriodEnd: false,
          providerCustomerRef: null,
          providerSubscriptionRef: null,
        },
      });
      await tx.tenantModule.updateMany({
        where: { tenantId },
        data: { isActive: false },
      });
      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          companyName: `Deleted workspace ${tenantId.slice(0, 8)}`,
          companyLogo: null,
          status: TenantStatus.CHURNED,
          suspendedAt: now,
          suspendedReason: 'Tenant deletion completed',
          onboardingRequestHash: null,
        },
      });

      const evidence = {
        policy: 'DELTCRM_TENANT_DELETION_V1',
        completedAt: now.toISOString(),
        biometricObjectsPurged: biometricObjects,
        biometricEnrollmentsRevoked: enrollments.length,
        usersAnonymized: users.length,
        employeesAnonymized: employees.length,
        rawLocationDataPurged: true,
        billingAndAuditRetention: true,
      };
      const evidenceHash = createHash('sha256')
        .update(JSON.stringify(evidence))
        .digest('hex');
      const completed = await tx.tenantDeletionJob.update({
        where: { id: jobId },
        data: {
          status: DeletionJobStatus.COMPLETED,
          biometricPurgedAt: now,
          completedAt: now,
          failureCode: null,
          evidence: { ...evidence, evidenceHash },
        },
      });
      await tx.systemAuditLog.create({
        data: {
          tenantId,
          action: 'platform.tenant.deletion_completed',
          module: 'platform.tenants',
          newValue: { deletionJobId: jobId, ...evidence, evidenceHash },
        },
      });
      return { data: completed };
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

function safeFailureCode(error: unknown) {
  const raw = error instanceof Error ? error.message : 'UNKNOWN';
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9_]+/g, '_')
    .slice(0, 120);
}
