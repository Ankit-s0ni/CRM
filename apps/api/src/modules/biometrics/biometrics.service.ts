import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../../shared/audit/audit.service';
import {
  PrismaService,
  PrismaTransaction,
} from '../../shared/database/prisma.service';
import { OutboxService } from '../../shared/events/outbox.service';
import { TenantContextService } from '../../shared/tenancy/tenant-context.service';
import {
  CompleteEnrollmentDto,
  CreateBiometricConsentDto,
  EnrollmentPresignDto,
} from './dto/biometrics.dto';
import { LivenessProvider } from './liveness-provider';
import { PrivateEvidenceStorageService } from './private-evidence-storage.service';

@Injectable()
export class BiometricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: TenantContextService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
    private readonly storage: PrivateEvidenceStorageService,
    private readonly liveness: LivenessProvider,
  ) {}

  currentConsent() {
    return this.prisma.forTenant(async (tx) => {
      const employee = await this.employee(tx);
      const consent = await tx.biometricConsent.findFirst({
        where: { employeeId: employee.id },
        orderBy: { consentedAt: 'desc' },
      });
      return {
        data:
          consent?.action === 'GRANTED'
            ? {
                id: consent.id,
                policyVersion: consent.policyVersion,
                consentedAt: consent.consentedAt,
                active: true,
              }
            : null,
      };
    });
  }

  createConsent(
    dto: CreateBiometricConsentDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const tenantId = this.requireTenantId();
    const currentVersion = process.env.BIOMETRIC_POLICY_VERSION ?? '1.2';
    if (dto.policyVersion !== currentVersion) {
      throw new ConflictException({
        code: 'CONSENT_VERSION_OUTDATED',
        message: 'Review and accept the current biometric policy',
        details: { currentVersion },
      });
    }
    return this.prisma.forTenant(async (tx) => {
      const employee = await this.employee(tx);
      const current = await tx.biometricConsent.findFirst({
        where: { employeeId: employee.id },
        orderBy: { consentedAt: 'desc' },
      });
      if (
        current?.action === 'GRANTED' &&
        current.policyVersion === dto.policyVersion
      ) {
        return { data: this.consentResponse(current), idempotent: true };
      }
      const consent = await tx.biometricConsent.create({
        data: {
          tenantId,
          employeeId: employee.id,
          action: 'GRANTED',
          policyVersion: dto.policyVersion,
          consentIp: ipAddress,
          consentUserAgent: userAgent,
        },
      });
      await Promise.all([
        this.audit.append(tx, {
          tenantId,
          action: 'attendance.biometric_consent.accepted',
          module: 'attendance',
          entityType: 'BiometricConsent',
          entityId: consent.id,
          newValue: {
            employeeId: employee.id,
            policyVersion: dto.policyVersion,
          },
        }),
        this.outbox.append(tx, {
          tenantId,
          eventKey: 'attendance.biometric_consent.accepted',
          payload: {
            employeeId: employee.id,
            policyVersion: dto.policyVersion,
          },
        }),
      ]);
      return { data: this.consentResponse(consent), idempotent: false };
    });
  }

  async withdrawConsent() {
    const tenantId = this.requireTenantId();
    const result = await this.prisma.forTenant(async (tx) => {
      const employee = await this.employee(tx);
      const consent = await tx.biometricConsent.findFirst({
        where: { employeeId: employee.id },
        orderBy: { consentedAt: 'desc' },
      });
      if (!consent || consent.action !== 'GRANTED') {
        return {
          response: { data: null, idempotent: true },
          employeeId: employee.id,
          objectKeys: [] as string[],
        };
      }
      const revokedAt = new Date();
      const activeEnrollments = await tx.faceEnrollment.findMany({
        where: { employeeId: employee.id, status: 'ACTIVE' },
        select: { privateObjectKey: true },
      });
      const withdrawal = await tx.biometricConsent.create({
        data: {
          tenantId,
          employeeId: employee.id,
          action: 'WITHDRAWN',
          policyVersion: consent.policyVersion,
          consentedAt: revokedAt,
          revokedAt,
        },
      });
      await Promise.all([
        tx.faceEnrollment.updateMany({
          where: { employeeId: employee.id, status: 'ACTIVE' },
          data: { status: 'REVOKED', revokedAt },
        }),
        tx.employee.update({
          where: { id: employee.id },
          data: {
            masterSelfie: null,
            faceEmbeddingRef: null,
            faceEnrolledAt: null,
            faceEnrolledBy: null,
          },
        }),
      ]);
      await Promise.all([
        this.audit.append(tx, {
          tenantId,
          action: 'attendance.biometric_consent.withdrawn',
          module: 'attendance',
          entityType: 'BiometricConsent',
          entityId: withdrawal.id,
          newValue: {
            employeeId: employee.id,
            grantedConsentId: consent.id,
            revokedAt,
          },
        }),
        this.outbox.append(tx, {
          tenantId,
          eventKey: 'attendance.biometric_consent.withdrawn',
          payload: {
            employeeId: employee.id,
            consentId: consent.id,
            withdrawalId: withdrawal.id,
          },
        }),
        this.outbox.append(tx, {
          tenantId,
          eventKey: 'attendance.biometric_evidence.deletion_requested',
          payload: { employeeId: employee.id, consentId: consent.id },
        }),
      ]);
      return {
        response: {
          data: { active: false, revokedAt },
          idempotent: false,
        },
        employeeId: employee.id,
        objectKeys: activeEnrollments.map(
          ({ privateObjectKey }) => privateObjectKey,
        ),
      };
    });
    await Promise.all(
      result.objectKeys.map((objectKey) =>
        this.storage.deleteEnrollmentObject(
          tenantId,
          result.employeeId,
          objectKey,
        ),
      ),
    );
    return result.response;
  }

  presign(dto: EnrollmentPresignDto) {
    const tenantId = this.requireTenantId();
    return this.prisma.forTenant(async (tx) => {
      const employee = await this.employee(tx);
      await this.assertEligible(tx, employee.id);
      return {
        data: await this.storage.presign(
          tenantId,
          employee.id,
          dto.filename,
          dto.contentType,
          dto.fileSize,
        ),
      };
    });
  }

  async complete(dto: CompleteEnrollmentDto) {
    const tenantId = this.requireTenantId();
    const userId = this.requireUserId();
    const employee = await this.prisma.forTenant((tx) => this.employee(tx));
    await this.storage.verifyOwnedObject(
      tenantId,
      employee.id,
      dto.privateObjectKey,
    );
    const proof = this.liveness.verify(
      dto.privateObjectKey,
      dto.livenessProofToken,
    );
    return this.prisma.forTenant(async (tx) => {
      await this.assertEligible(tx, employee.id);
      const previous = await tx.faceEnrollment.findFirst({
        where: { employeeId: employee.id },
        orderBy: { version: 'desc' },
      });
      if (previous?.status === 'ACTIVE') {
        throw new ConflictException({
          code: 'FACE_PROFILE_LOCKED',
          message: 'Your face profile can only be replaced by HR',
        });
      }
      const version = (previous?.version ?? 0) + 1;
      const enrollment = await tx.faceEnrollment.create({
        data: {
          tenantId,
          employeeId: employee.id,
          version,
          privateObjectKey: dto.privateObjectKey,
          embeddingRef: proof.embeddingRef,
          livenessProvider: proof.provider,
          enrolledBy: userId,
        },
      });
      await tx.employee.update({
        where: { id: employee.id },
        data: {
          masterSelfie: dto.privateObjectKey,
          faceEmbeddingRef: proof.embeddingRef,
          faceEnrolledAt: enrollment.enrolledAt,
          faceEnrolledBy: userId,
        },
      });
      await Promise.all([
        this.audit.append(tx, {
          tenantId,
          action: 'attendance.face_enrollment.completed',
          module: 'attendance',
          entityType: 'FaceEnrollment',
          entityId: enrollment.id,
          newValue: {
            employeeId: employee.id,
            version,
            provider: proof.provider,
          },
        }),
        this.outbox.append(tx, {
          tenantId,
          eventKey: 'attendance.face_enrollment.completed',
          payload: {
            employeeId: employee.id,
            enrollmentId: enrollment.id,
            version,
          },
        }),
      ]);
      return {
        data: {
          id: enrollment.id,
          version,
          status: enrollment.status,
          enrolledAt: enrollment.enrolledAt,
        },
      };
    });
  }

  status() {
    return this.prisma.forTenant(async (tx) => {
      const employee = await this.employee(tx);
      const [consent, enrollment] = await Promise.all([
        tx.biometricConsent.findFirst({
          where: { employeeId: employee.id },
          orderBy: { consentedAt: 'desc' },
        }),
        tx.faceEnrollment.findFirst({
          where: { employeeId: employee.id, status: 'ACTIVE' },
          orderBy: { version: 'desc' },
        }),
      ]);
      return {
        data: {
          consentActive: consent?.action === 'GRANTED',
          enrolled: Boolean(enrollment),
          version: enrollment?.version ?? null,
          enrolledAt: enrollment?.enrolledAt ?? null,
          eligibleForFaceVerification: Boolean(
            consent?.action === 'GRANTED' && enrollment,
          ),
        },
      };
    });
  }

  employeeStatus(employeeId: string) {
    return this.prisma.forTenant(async (tx) => {
      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
        select: { id: true },
      });
      if (!employee) this.throwEmployeeNotFound();
      const [consent, enrollment] = await Promise.all([
        tx.biometricConsent.findFirst({
          where: { employeeId },
          orderBy: { consentedAt: 'desc' },
        }),
        tx.faceEnrollment.findFirst({
          where: { employeeId, status: 'ACTIVE' },
          orderBy: { version: 'desc' },
        }),
      ]);
      return {
        data: {
          consentActive: consent?.action === 'GRANTED',
          consentPolicyVersion:
            consent?.action === 'GRANTED' ? consent.policyVersion : null,
          enrolled: Boolean(enrollment),
          version: enrollment?.version ?? null,
          enrolledAt: enrollment?.enrolledAt ?? null,
          eligibleForFaceVerification: Boolean(
            consent?.action === 'GRANTED' && enrollment,
          ),
        },
      };
    });
  }

  async resetEmployeeFace(employeeId: string, reason: string) {
    const tenantId = this.requireTenantId();
    const actorUserId = this.requireUserId();
    const result = await this.prisma.forTenant(async (tx) => {
      const employee = await tx.employee.findUnique({
        where: { id: employeeId },
        select: { id: true },
      });
      if (!employee) this.throwEmployeeNotFound();
      const enrollments = await tx.faceEnrollment.findMany({
        where: { employeeId, status: 'ACTIVE' },
        select: { id: true, privateObjectKey: true, version: true },
      });
      if (!enrollments.length) {
        return { objectKeys: [] as string[], idempotent: true };
      }
      const revokedAt = new Date();
      await Promise.all([
        tx.faceEnrollment.updateMany({
          where: { employeeId, status: 'ACTIVE' },
          data: { status: 'REVOKED', revokedAt },
        }),
        tx.employee.update({
          where: { id: employeeId },
          data: {
            masterSelfie: null,
            faceEmbeddingRef: null,
            faceEnrolledAt: null,
            faceEnrolledBy: null,
          },
        }),
        this.audit.append(tx, {
          tenantId,
          actorUserId,
          action: 'attendance.face_enrollment.reset',
          module: 'attendance',
          entityType: 'Employee',
          entityId: employeeId,
          oldValue: { versions: enrollments.map(({ version }) => version) },
          newValue: { reason, revokedAt },
        }),
        this.outbox.append(tx, {
          tenantId,
          eventKey: 'attendance.face_enrollment.reset',
          payload: { employeeId, reason, revokedAt },
        }),
      ]);
      return {
        objectKeys: enrollments.map(({ privateObjectKey }) => privateObjectKey),
        idempotent: false,
      };
    });
    await Promise.all(
      result.objectKeys.map((objectKey) =>
        this.storage.deleteEnrollmentObject(tenantId, employeeId, objectKey),
      ),
    );
    return { data: { enrolled: false }, idempotent: result.idempotent };
  }

  private async assertEligible(tx: PrismaTransaction, employeeId: string) {
    const consent = await tx.biometricConsent.findFirst({
      where: { employeeId },
      orderBy: { consentedAt: 'desc' },
    });
    if (!consent || consent.action !== 'GRANTED') {
      throw new ForbiddenException({
        code: 'CONSENT_MISSING',
        message: 'Active biometric consent is required for face enrollment',
      });
    }
  }

  private async employee(tx: PrismaTransaction) {
    const employee = await tx.employee.findUnique({
      where: { userId: this.requireUserId() },
      select: { id: true },
    });
    if (!employee) {
      throw new NotFoundException({
        code: 'EMPLOYEE_PROFILE_NOT_FOUND',
        message: 'No employee profile is linked to this account',
      });
    }
    return employee;
  }

  private throwEmployeeNotFound(): never {
    throw new NotFoundException({
      code: 'EMPLOYEE_NOT_FOUND',
      message: 'Employee was not found',
    });
  }

  private consentResponse(consent: {
    id: string;
    policyVersion: string;
    consentedAt: Date;
  }) {
    return {
      id: consent.id,
      policyVersion: consent.policyVersion,
      consentedAt: consent.consentedAt,
      active: true,
    };
  }

  private requireTenantId() {
    if (!this.context.tenantId) throw new Error('Tenant context is required');
    return this.context.tenantId;
  }

  private requireUserId() {
    if (!this.context.userId) throw new Error('User context is required');
    return this.context.userId;
  }
}
