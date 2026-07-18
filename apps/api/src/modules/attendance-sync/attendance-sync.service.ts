import { HttpException, Injectable, Logger } from '@nestjs/common';
import { AttendanceSyncStatus, Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import {
  PrismaService,
  PrismaTransaction,
} from '../../shared/database/prisma.service';
import { TenantContextService } from '../../shared/tenancy/tenant-context.service';
import { AttendanceContextService } from '../attendance/application/attendance-context.service';
import { AttendanceVerificationService } from '../attendance-verification/attendance-verification.service';
import type { VerifiedPunchDto } from '../attendance-verification/dto/verified-punch.dto';
import {
  AttendanceSyncDto,
  SyncAttendanceItemDto,
} from './dto/attendance-sync.dto';

type SyncClass = 'ACCEPTED' | 'DUPLICATE' | 'RETRYABLE' | 'REJECTED';
type SyncOutcome = {
  clientEventUuid: string;
  status: SyncClass;
  code?: string;
  attendanceEventId?: string;
  regularizationSuggested: boolean;
  data?: unknown;
};

@Injectable()
export class AttendanceSyncService {
  private readonly logger = new Logger(AttendanceSyncService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: TenantContextService,
    private readonly attendanceContext: AttendanceContextService,
    private readonly verification: AttendanceVerificationService,
  ) {}

  async sync(
    dto: AttendanceSyncDto,
    request: { ipAddress?: string; userAgent?: string; jwtDeviceId?: string },
  ) {
    const attributed = await this.attribute(dto.items);
    const grouped = groupByDay(attributed);
    const outcomes = new Map<string, SyncOutcome>();
    for (const [, items] of [...grouped.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    )) {
      try {
        const dayOutcomes = await this.prisma.forTenant(async (tx) => {
          const result: SyncOutcome[] = [];
          for (const item of items)
            result.push(await this.processOne(tx, item, request));
          return result;
        });
        for (const outcome of dayOutcomes)
          outcomes.set(outcome.clientEventUuid, outcome);
      } catch (error) {
        this.logger.error(
          `Offline sync day ${items[0]?.attendanceDate ?? 'unknown'} failed`,
          error instanceof Error ? error.stack : String(error),
        );
        for (const item of items) {
          outcomes.set(item.clientEventUuid, {
            clientEventUuid: item.clientEventUuid,
            status: 'RETRYABLE',
            code: 'SYNC_DEPENDENCY_UNAVAILABLE',
            regularizationSuggested: false,
          });
        }
      }
    }
    return {
      data: dto.items.map((item) => outcomes.get(item.clientEventUuid)!),
    };
  }

  status(clientEventUuid: string) {
    return this.prisma.forTenant(async (tx) => {
      const employee = await this.attendanceContext.employeeForUser(
        tx,
        this.requireUserId(),
      );
      const receipt = await tx.attendanceSyncReceipt.findFirst({
        where: { clientEventUuid, employeeId: employee.id },
      });
      return { data: receipt ? duplicateOutcome(receipt) : null };
    });
  }

  private attribute(items: SyncAttendanceItemDto[]) {
    return this.prisma.forTenant(async (tx) => {
      const employee = await this.attendanceContext.employeeForUser(
        tx,
        this.requireUserId(),
      );
      const result: Array<SyncAttendanceItemDto & { attendanceDate: string }> =
        [];
      for (const item of items) {
        const runtime = await this.attendanceContext.resolve(
          tx,
          employee,
          new Date(item.clientTime),
        );
        result.push({ ...item, attendanceDate: runtime.attendanceDate.value });
      }
      return result.sort(
        (left, right) =>
          left.clientTime.localeCompare(right.clientTime) ||
          left.clientEventUuid.localeCompare(right.clientEventUuid),
      );
    });
  }

  private async processOne(
    tx: PrismaTransaction,
    item: SyncAttendanceItemDto & { attendanceDate: string },
    request: { ipAddress?: string; userAgent?: string; jwtDeviceId?: string },
  ): Promise<SyncOutcome> {
    const tenantId = this.requireTenantId();
    const employee = await this.attendanceContext.employeeForUser(
      tx,
      this.requireUserId(),
    );
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${tenantId}:${item.clientEventUuid}`}, 0))`;
    const payloadHash = hashItem(item);
    const prior = await tx.attendanceSyncReceipt.findUnique({
      where: {
        tenantId_clientEventUuid: {
          tenantId,
          clientEventUuid: item.clientEventUuid,
        },
      },
    });
    if (prior) {
      if (prior.payloadHash !== payloadHash) {
        return {
          clientEventUuid: item.clientEventUuid,
          status: 'REJECTED',
          code: 'IDEMPOTENCY_PAYLOAD_MISMATCH',
          regularizationSuggested: false,
        };
      }
      return duplicateOutcome(prior);
    }

    const runtime = await this.attendanceContext.resolve(
      tx,
      employee,
      new Date(item.clientTime),
    );
    const validation = validateOffline(
      item,
      runtime.policy.maxOfflineSyncHours ?? 48,
    );
    if (validation) {
      return this.saveOutcome(tx, employee.id, item, payloadHash, validation);
    }
    const timeSuspect = Math.abs(item.clientClockOffsetSeconds) > 120;
    try {
      const result = await this.verification.punchInTransaction(
        tx,
        toVerifiedPunch(item),
        request,
        {
          offline: true,
          timeSuspect,
          clockSkewSeconds: item.clientClockOffsetSeconds,
        },
      );
      if ('error' in result && result.error) {
        const retryable = result.error === 'VERIFICATION_PROVIDER_UNAVAILABLE';
        return this.saveOutcome(tx, employee.id, item, payloadHash, {
          status: retryable ? 'RETRYABLE' : 'REJECTED',
          code: result.error,
          regularizationSuggested: !retryable,
        });
      }
      const event = await tx.attendanceEvent.findFirst({
        where: {
          employeeId: employee.id,
          clientEventUuid: item.clientEventUuid,
        },
        select: { id: true },
      });
      return this.saveOutcome(tx, employee.id, item, payloadHash, {
        status: 'ACCEPTED',
        attendanceEventId: event?.id,
        regularizationSuggested: false,
        data: result,
      });
    } catch (error) {
      const classified = classifyException(error);
      return this.saveOutcome(tx, employee.id, item, payloadHash, classified);
    }
  }

  private async saveOutcome(
    tx: PrismaTransaction,
    employeeId: string,
    item: SyncAttendanceItemDto,
    payloadHash: string,
    outcome: Omit<SyncOutcome, 'clientEventUuid'>,
  ): Promise<SyncOutcome> {
    const complete = { clientEventUuid: item.clientEventUuid, ...outcome };
    await tx.attendanceSyncReceipt.create({
      data: {
        tenantId: this.requireTenantId(),
        employeeId,
        clientEventUuid: item.clientEventUuid,
        payloadHash,
        status: storedStatus(outcome.status),
        attendanceEventId: outcome.attendanceEventId,
        errorCode: outcome.code,
        message: outcome.code,
        regularizationSuggested: outcome.regularizationSuggested,
        clientTime: new Date(item.clientTime),
        outcome: complete as Prisma.InputJsonValue,
      },
    });
    return complete;
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

function validateOffline(item: SyncAttendanceItemDto, maxHours: number) {
  const now = Date.now();
  const clientTime = new Date(item.clientTime).getTime();
  const issuedAt = new Date(item.integrityIssuedAt).getTime();
  const expiresAt = new Date(item.integrityExpiresAt).getTime();
  if (
    now - clientTime > maxHours * 60 * 60_000 ||
    clientTime > now + 5 * 60_000
  ) {
    return rejection('OFFLINE_WINDOW_EXPIRED', true);
  }
  if (
    issuedAt > clientTime + 5 * 60_000 ||
    issuedAt < clientTime - 10 * 60_000 ||
    expiresAt < clientTime ||
    expiresAt < now
  ) {
    return rejection('OFFLINE_INTEGRITY_EXPIRED', true);
  }
  if (Math.abs(item.clientClockOffsetSeconds) > 300) {
    return rejection('CLOCK_TAMPER', false);
  }
  return null;
}

function rejection(code: string, regularizationSuggested: boolean) {
  return { status: 'REJECTED' as const, code, regularizationSuggested };
}

function toVerifiedPunch(item: SyncAttendanceItemDto): VerifiedPunchDto {
  return {
    type: item.type,
    deviceUuid: item.deviceUuid,
    attestationToken: item.attestationToken,
    clientTime: item.clientTime,
    requestId: item.clientEventUuid,
    latitude: item.latitude,
    longitude: item.longitude,
    accuracyMeters: item.accuracyMeters,
    mockLocation: item.mockLocation,
    selfieKey: item.selfieKey,
    appVersion: item.appVersion,
    osVersion: item.osVersion,
  };
}

function hashItem(item: SyncAttendanceItemDto) {
  return createHash('sha256')
    .update(
      JSON.stringify({
        type: item.type,
        deviceUuid: item.deviceUuid,
        attestationToken: item.attestationToken,
        integrityIssuedAt: item.integrityIssuedAt,
        integrityExpiresAt: item.integrityExpiresAt,
        clientTime: item.clientTime,
        clientClockOffsetSeconds: item.clientClockOffsetSeconds,
        latitude: item.latitude,
        longitude: item.longitude,
        accuracyMeters: item.accuracyMeters,
        mockLocation: item.mockLocation ?? false,
        selfieKey: item.selfieKey ?? null,
        appVersion: item.appVersion ?? null,
        osVersion: item.osVersion ?? null,
      }),
    )
    .digest('hex');
}

function groupByDay<T extends { attendanceDate: string }>(items: T[]) {
  const groups = new Map<string, T[]>();
  for (const item of items)
    groups.set(item.attendanceDate, [
      ...(groups.get(item.attendanceDate) ?? []),
      item,
    ]);
  return groups;
}

function storedStatus(status: SyncClass) {
  if (status === 'ACCEPTED' || status === 'DUPLICATE')
    return AttendanceSyncStatus.ACCEPTED;
  if (status === 'RETRYABLE') return AttendanceSyncStatus.RETRYABLE;
  return AttendanceSyncStatus.REJECTED;
}

function duplicateOutcome(receipt: {
  clientEventUuid: string;
  outcome: Prisma.JsonValue;
  attendanceEventId: string | null;
  regularizationSuggested: boolean;
}) {
  const stored =
    receipt.outcome &&
    typeof receipt.outcome === 'object' &&
    !Array.isArray(receipt.outcome)
      ? (receipt.outcome as Record<string, unknown>)
      : {};
  return {
    ...stored,
    clientEventUuid: receipt.clientEventUuid,
    status: 'DUPLICATE' as const,
    ...(receipt.attendanceEventId
      ? { attendanceEventId: receipt.attendanceEventId }
      : {}),
    regularizationSuggested: receipt.regularizationSuggested,
  };
}

function classifyException(
  error: unknown,
): Omit<SyncOutcome, 'clientEventUuid'> {
  if (error instanceof HttpException) {
    const body = error.getResponse();
    const code =
      typeof body === 'object' && body && 'code' in body
        ? String(body.code)
        : 'SYNC_REJECTED';
    const retryable = error.getStatus() >= 500;
    return {
      status: retryable ? 'RETRYABLE' : 'REJECTED',
      code,
      regularizationSuggested: !retryable,
    };
  }
  throw error;
}
