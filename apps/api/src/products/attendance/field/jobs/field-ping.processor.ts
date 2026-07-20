import { Injectable } from '@nestjs/common';
import { FieldIngestionStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { TenantJobContextRunner } from '../../../../platform/tenancy/public';
import { FieldPresence, FieldPresenceService } from '../field-presence.service';
import type { FieldPingTask } from './field-ping.queue';
import { FieldRouteService } from '../route/field-route.service';

type StoredPing = {
  sessionId: string;
  latitude: number;
  longitude: number;
  accuracyM: number | null;
  speedMps: number | null;
  batteryLevel: number | null;
  isMock: boolean;
  capturedAt: string;
  isOfflineSync: boolean;
};

@Injectable()
export class FieldPingProcessor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly runner: TenantJobContextRunner,
    private readonly presence: FieldPresenceService,
    private readonly routes: FieldRouteService,
  ) {}

  process(task: FieldPingTask) {
    return this.runner.run(task, async () => {
      const result = await this.prisma.forTenant(async (tx) => {
        await tx.$queryRaw`SELECT id FROM field_ping_receipts WHERE id IN (${Prisma.join(
          task.receiptIds.map((id) => Prisma.sql`${id}::uuid`),
        )}) FOR UPDATE`;
        const receipts = await tx.fieldPingReceipt.findMany({
          where: {
            id: { in: task.receiptIds },
            employeeId: task.employeeId,
            deviceId: task.deviceId,
            status: FieldIngestionStatus.PENDING,
          },
          orderBy: [{ capturedAt: 'asc' }, { clientPingUuid: 'asc' }],
        });
        if (!receipts.length) return { processedCount: 0, presences: [] };
        const rows = receipts.map((receipt) => {
          const payload = parsePayload(receipt.payload);
          return {
            id: crypto.randomUUID(),
            tenantId: task.tenantId,
            sessionId: receipt.sessionId,
            employeeId: receipt.employeeId,
            deviceId: receipt.deviceId,
            clientPingUuid: receipt.clientPingUuid,
            latitude: payload.latitude,
            longitude: payload.longitude,
            accuracyM: payload.accuracyM,
            speedMps: payload.speedMps,
            isMock: payload.isMock,
            batteryLevel: payload.batteryLevel,
            capturedAt: receipt.capturedAt,
            isOfflineSync: payload.isOfflineSync,
          };
        });
        await tx.fieldLocationPing.createMany({ data: rows });
        for (const row of rows) {
          await tx.fieldPingReceipt.update({
            where: {
              tenantId_deviceId_clientPingUuid: {
                tenantId: task.tenantId,
                deviceId: task.deviceId,
                clientPingUuid: row.clientPingUuid,
              },
            },
            data: {
              status: FieldIngestionStatus.PROCESSED,
              pingId: row.id,
              processedAt: new Date(),
            },
          });
        }
        const latestBySession = new Map<string, (typeof rows)[number]>();
        for (const row of rows) latestBySession.set(row.sessionId, row);
        for (const [sessionId, latest] of latestBySession) {
          await tx.fieldTrackingSession.updateMany({
            where: {
              id: sessionId,
              endedAt: null,
              OR: [
                { lastPingAt: null },
                { lastPingAt: { lt: latest.capturedAt } },
              ],
            },
            data: { lastPingAt: latest.capturedAt },
          });
        }
        return {
          processedCount: rows.length,
          presences: [...latestBySession.values()].map(toPresence),
        };
      });
      for (const item of result.presences) {
        await this.presence.publish(task.tenantId, item);
        await this.routes.rebuildForInstant(
          item.employeeId,
          new Date(item.capturedAt),
        );
      }
      return {
        processed: result.processedCount,
        published: result.presences.length,
      };
    });
  }
}

function parsePayload(value: Prisma.JsonValue): StoredPing {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    throw new Error('FIELD_PING_PAYLOAD_INVALID');
  }
  const payload = value as Record<string, unknown>;
  if (
    typeof payload.sessionId !== 'string' ||
    typeof payload.latitude !== 'number' ||
    typeof payload.longitude !== 'number' ||
    typeof payload.capturedAt !== 'string'
  ) {
    throw new Error('FIELD_PING_PAYLOAD_INVALID');
  }
  return {
    sessionId: payload.sessionId,
    latitude: payload.latitude,
    longitude: payload.longitude,
    accuracyM: numberOrNull(payload.accuracyM),
    speedMps: numberOrNull(payload.speedMps),
    batteryLevel: numberOrNull(payload.batteryLevel),
    isMock: payload.isMock === true,
    capturedAt: payload.capturedAt,
    isOfflineSync: payload.isOfflineSync === true,
  };
}

function numberOrNull(value: unknown) {
  return typeof value === 'number' ? value : null;
}

function toPresence(row: {
  employeeId: string;
  sessionId: string;
  latitude: number | Prisma.Decimal;
  longitude: number | Prisma.Decimal;
  accuracyM: number | null;
  speedMps: number | Prisma.Decimal | null;
  batteryLevel: number | null;
  capturedAt: Date;
}): FieldPresence {
  return {
    employeeId: row.employeeId,
    sessionId: row.sessionId,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    accuracyM: row.accuracyM,
    speedMps: row.speedMps === null ? null : Number(row.speedMps),
    batteryLevel: row.batteryLevel,
    capturedAt: row.capturedAt.toISOString(),
  };
}
