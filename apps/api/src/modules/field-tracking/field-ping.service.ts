import {
  ConflictException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { FieldIngestionStatus, Prisma } from '@prisma/client';
import {
  PrismaService,
  PrismaTransaction,
} from '../../shared/database/prisma.service';
import { TenantContextService } from '../../shared/tenancy/tenant-context.service';
import { RuntimeConfigService } from '../runtime-config/runtime-config.service';
import { FieldPingBatchDto, FieldPingDto } from './dto/field-tracking.dto';
import { FieldPingQueue } from './jobs/field-ping.queue';
import { FieldRateLimitService } from './field-rate-limit.service';

type PingOutcome = {
  clientPingUuid: string;
  status: 'ACCEPTED' | 'DUPLICATE' | 'REJECTED';
  code?: string;
  pingId?: string;
};

type PreparedPing = { outcome: PingOutcome; receiptId?: string };

@Injectable()
export class FieldPingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: TenantContextService,
    private readonly runtimeConfig: RuntimeConfigService,
    private readonly queue: FieldPingQueue,
    private readonly rateLimit: FieldRateLimitService,
  ) {}

  async ingest(dto: FieldPingBatchDto) {
    this.assertChronological(dto.items);
    const identity = await this.resolveIdentity(dto.deviceUuid);
    await this.rateLimit.assertAllowed(
      this.requireTenantId(),
      identity.deviceId,
      dto.items.length,
    );
    const prepared: PreparedPing[] = [];
    for (const item of dto.items) {
      prepared.push(await this.prepareOne(identity, item));
    }
    const receiptIds = prepared.flatMap(({ receiptId }) =>
      receiptId ? [receiptId] : [],
    );
    if (receiptIds.length) {
      try {
        await this.queue.enqueue({
          tenantId: this.requireTenantId(),
          employeeId: identity.employeeId,
          deviceId: identity.deviceId,
          receiptIds,
        });
      } catch {
        throw new ServiceUnavailableException({
          code: 'SYNC_DEPENDENCY_UNAVAILABLE',
          message: 'Location ingestion is temporarily unavailable',
          details: { retryable: true },
        });
      }
    }
    return { data: prepared.map(({ outcome }) => outcome) };
  }

  private resolveIdentity(deviceUuid: string) {
    return this.prisma.forTenant(async (tx) => {
      const employee = await this.runtimeConfig.assertFieldTrackingEnabled(
        tx,
        this.requireUserId(),
      );
      const device = await tx.registeredDevice.findUnique({
        where: {
          tenantId_deviceUuid: {
            tenantId: this.requireTenantId(),
            deviceUuid,
          },
        },
      });
      if (
        !device ||
        device.employeeId !== employee.id ||
        device.status !== 'ACTIVE'
      ) {
        this.notAllowed();
      }
      return { employeeId: employee.id, deviceId: device.id };
    });
  }

  private prepareOne(
    identity: { employeeId: string; deviceId: string },
    item: FieldPingDto,
  ) {
    const payload = canonicalPing(item);
    const payloadHash = hashPayload(payload);
    const capturedAt = new Date(item.capturedAt);
    return this.prisma.forTenant(async (tx): Promise<PreparedPing> => {
      const prior = await tx.fieldPingReceipt.findUnique({
        where: {
          tenantId_deviceId_clientPingUuid: {
            tenantId: this.requireTenantId(),
            deviceId: identity.deviceId,
            clientPingUuid: item.clientPingUuid,
          },
        },
      });
      if (prior) {
        if (prior.payloadHash !== payloadHash) {
          throw new ConflictException({
            code: 'IDEMPOTENCY_PAYLOAD_MISMATCH',
            message: 'The ping UUID was already used with different content',
            details: { clientPingUuid: item.clientPingUuid },
          });
        }
        return {
          outcome: receiptOutcome(prior, true),
          ...(prior.status === FieldIngestionStatus.PENDING
            ? { receiptId: prior.id }
            : {}),
        };
      }

      const session = await tx.fieldTrackingSession.findFirst({
        where: {
          id: item.sessionId,
          employeeId: identity.employeeId,
          deviceId: identity.deviceId,
          endedAt: null,
        },
      });
      if (!session) {
        return this.reject(
          tx,
          identity,
          item,
          payload,
          payloadHash,
          'PING_SESSION_MISMATCH',
        );
      }
      const timeCode = validateCapturedTime(capturedAt);
      if (timeCode) {
        return this.reject(tx, identity, item, payload, payloadHash, timeCode);
      }
      if (item.isMock) {
        return this.reject(
          tx,
          identity,
          item,
          payload,
          payloadHash,
          'MOCK_LOCATION',
        );
      }

      const receipt = await tx.fieldPingReceipt.create({
        data: {
          tenantId: this.requireTenantId(),
          sessionId: session.id,
          employeeId: identity.employeeId,
          deviceId: identity.deviceId,
          clientPingUuid: item.clientPingUuid,
          payloadHash,
          payload: payload as Prisma.InputJsonValue,
          capturedAt,
        },
      });
      return {
        outcome: {
          clientPingUuid: item.clientPingUuid,
          status: 'ACCEPTED',
        },
        receiptId: receipt.id,
      };
    });
  }

  private async reject(
    tx: PrismaTransaction,
    identity: { employeeId: string; deviceId: string },
    item: FieldPingDto,
    payload: Record<string, unknown>,
    payloadHash: string,
    errorCode: string,
  ): Promise<PreparedPing> {
    const receipt = await tx.fieldPingReceipt.create({
      data: {
        tenantId: this.requireTenantId(),
        sessionId: item.sessionId,
        employeeId: identity.employeeId,
        deviceId: identity.deviceId,
        clientPingUuid: item.clientPingUuid,
        payloadHash,
        payload: payload as Prisma.InputJsonValue,
        status: FieldIngestionStatus.REJECTED,
        errorCode,
        capturedAt: new Date(item.capturedAt),
        processedAt: new Date(),
      },
    });
    return { outcome: receiptOutcome(receipt, false) };
  }

  private assertChronological(items: FieldPingDto[]) {
    for (let index = 1; index < items.length; index += 1) {
      if (items[index].capturedAt < items[index - 1].capturedAt) {
        throw new ConflictException({
          code: 'PING_BATCH_NOT_CHRONOLOGICAL',
          message: 'Ping batches must be ordered by captured time',
        });
      }
    }
  }

  private notAllowed(): never {
    throw new ForbiddenException({
      code: 'FIELD_TRACKING_NOT_ALLOWED',
      message: 'Field tracking is not allowed for this employee or device',
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

function canonicalPing(item: FieldPingDto): Record<string, unknown> {
  return {
    sessionId: item.sessionId,
    latitude: item.latitude,
    longitude: item.longitude,
    accuracyM: item.accuracyM ?? null,
    speedMps: item.speedMps ?? null,
    batteryLevel: item.batteryLevel ?? null,
    isMock: item.isMock ?? false,
    capturedAt: item.capturedAt,
    isOfflineSync: item.isOfflineSync ?? false,
  };
}

function hashPayload(payload: Record<string, unknown>) {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

function validateCapturedTime(value: Date) {
  const age = Date.now() - value.getTime();
  if (age < -5 * 60_000) return 'PING_CAPTURED_IN_FUTURE';
  if (age > 7 * 24 * 60 * 60_000) return 'PING_CAPTURED_TOO_OLD';
  return null;
}

function receiptOutcome(
  receipt: {
    clientPingUuid: string;
    status: FieldIngestionStatus;
    errorCode: string | null;
    pingId: string | null;
  },
  duplicate: boolean,
): PingOutcome {
  return {
    clientPingUuid: receipt.clientPingUuid,
    status:
      receipt.status === FieldIngestionStatus.REJECTED
        ? 'REJECTED'
        : duplicate
          ? 'DUPLICATE'
          : 'ACCEPTED',
    ...(receipt.errorCode ? { code: receipt.errorCode } : {}),
    ...(receipt.pingId ? { pingId: receipt.pingId } : {}),
  };
}
