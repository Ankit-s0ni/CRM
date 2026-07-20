import {
  ForbiddenException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import {
  PrismaService,
  PrismaTransaction,
} from '../../../shared/database/prisma.service';
import { TenantContextService } from '../../../platform/tenancy/public';
import { AttendanceContextService } from '../core/application/attendance-context.service';
import { DeviceIntegrityChallengeDto } from './dto/verified-punch.dto';

export type IntegrityChallengeBinding = {
  id: string;
  nonceHash: string;
  action: string;
};

@Injectable()
export class DeviceIntegrityChallengeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: TenantContextService,
    private readonly attendanceContext: AttendanceContextService,
  ) {}

  create(dto: DeviceIntegrityChallengeDto) {
    const tenantId = this.requireTenantId();
    return this.prisma.forTenant(async (tx) => {
      const employee = await this.attendanceContext.employeeForUser(
        tx,
        this.requireUserId(),
      );
      const device = await tx.registeredDevice.findUnique({
        where: {
          tenantId_deviceUuid: { tenantId, deviceUuid: dto.deviceUuid },
        },
        select: { id: true, employeeId: true, status: true, platform: true },
      });
      if (
        !device ||
        device.employeeId !== employee.id ||
        device.status !== 'ACTIVE'
      ) {
        throw new ForbiddenException({
          code: 'DEVICE_NOT_OWNED',
          message: 'An active approved device is required',
        });
      }
      const nonce = randomBytes(32).toString('base64url');
      const ttlSeconds = boundedTtl();
      const expiresAt = new Date(Date.now() + ttlSeconds * 1_000);
      const challenge = await tx.deviceIntegrityChallenge.create({
        data: {
          tenantId,
          employeeId: employee.id,
          deviceId: device.id,
          nonceHash: sha256(nonce),
          action: dto.action,
          expiresAt,
        },
        select: { id: true },
      });
      return {
        data: {
          id: challenge.id,
          nonce,
          platform: device.platform,
          expiresAt,
        },
      };
    });
  }

  async resolve(
    tx: PrismaTransaction,
    challengeId: string,
    binding: { tenantId: string; employeeId: string; deviceId: string },
  ): Promise<IntegrityChallengeBinding> {
    const challenge = await tx.deviceIntegrityChallenge.findFirst({
      where: {
        id: challengeId,
        tenantId: binding.tenantId,
        employeeId: binding.employeeId,
        deviceId: binding.deviceId,
      },
      select: {
        id: true,
        nonceHash: true,
        action: true,
        expiresAt: true,
        consumedAt: true,
      },
    });
    if (!challenge) this.invalid('INTEGRITY_CHALLENGE_INVALID');
    if (challenge.consumedAt) this.invalid('INTEGRITY_REPLAYED');
    if (challenge.expiresAt.getTime() <= Date.now()) {
      this.invalid('INTEGRITY_CHALLENGE_EXPIRED');
    }
    return challenge;
  }

  async consume(tx: PrismaTransaction, challengeId: string) {
    const consumed = await tx.deviceIntegrityChallenge.updateMany({
      where: {
        id: challengeId,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) this.invalid('INTEGRITY_REPLAYED');
  }

  cleanupExpired(now = new Date()) {
    const retentionDays = boundedRetentionDays();
    const retainedAfter = new Date(
      now.getTime() - retentionDays * 24 * 60 * 60_000,
    );
    return this.prisma.forAdmin((tx) =>
      tx.deviceIntegrityChallenge.deleteMany({
        where: { expiresAt: { lt: retainedAfter } },
      }),
    );
  }

  private invalid(code: string): never {
    throw new UnprocessableEntityException({
      code,
      message: 'Device integrity evidence is invalid or has already been used',
    });
  }

  private requireTenantId() {
    const tenantId = this.context.tenantId;
    if (!tenantId) throw new Error('TENANT_CONTEXT_REQUIRED');
    return tenantId;
  }

  private requireUserId() {
    const userId = this.context.userId;
    if (!userId) throw new Error('USER_CONTEXT_REQUIRED');
    return userId;
  }
}

function boundedTtl() {
  const configured = Number(
    process.env.INTEGRITY_CHALLENGE_TTL_SECONDS ?? 48 * 60 * 60,
  );
  if (!Number.isFinite(configured)) return 48 * 60 * 60;
  return Math.max(300, Math.min(48 * 60 * 60, Math.floor(configured)));
}

function boundedRetentionDays() {
  const configured = Number(
    process.env.INTEGRITY_CHALLENGE_RETENTION_DAYS ?? 7,
  );
  if (!Number.isFinite(configured)) return 7;
  return Math.max(1, Math.min(30, Math.floor(configured)));
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('base64url');
}
