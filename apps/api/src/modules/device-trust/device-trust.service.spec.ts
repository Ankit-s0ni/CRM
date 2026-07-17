import { DevicePlatform, DeviceStatus } from '@prisma/client';
import { AuditService } from '../../shared/audit/audit.service';
import type {
  PrismaService,
  PrismaTransaction,
} from '../../shared/database/prisma.service';
import { OutboxService } from '../../shared/events/outbox.service';
import { TenantContextService } from '../../shared/tenancy/tenant-context.service';
import { DeviceTrustService } from './device-trust.service';

const now = new Date('2026-07-17T10:00:00.000Z');
const pendingDevice = {
  id: '10000000-0000-4000-8000-000000000001',
  tenantId: '20000000-0000-4000-8000-000000000001',
  employeeId: '30000000-0000-4000-8000-000000000001',
  deviceUuid: '40000000-0000-4000-8000-000000000001',
  platform: DevicePlatform.ANDROID,
  deviceModel: 'Pixel',
  osVersion: '16',
  appVersion: '1.0.0',
  pushToken: null,
  status: DeviceStatus.PENDING_APPROVAL,
  isPrimary: false,
  approvedBy: null,
  blockedBy: null,
  blockedReason: null,
  replacedByDeviceId: null,
  lastIp: null,
  registeredAt: now,
  lastSeenAt: now,
};

describe('DeviceTrustService', () => {
  const context = {
    tenantId: pendingDevice.tenantId,
    userId: '50000000-0000-4000-8000-000000000001',
  } as TenantContextService;
  const auditAppend = jest.fn().mockResolvedValue({});
  const outboxAppend = jest.fn().mockResolvedValue({});
  const audit = { append: auditAppend } as unknown as AuditService;
  const outbox = { append: outboxAppend } as unknown as OutboxService;

  beforeEach(() => jest.clearAllMocks());

  it('registers an employee device as pending without exposing secrets', async () => {
    const create = jest.fn().mockResolvedValue(pendingDevice);
    const tx = {
      employee: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: pendingDevice.employeeId }),
      },
      registeredDevice: {
        findUnique: jest.fn().mockResolvedValue(null),
        create,
      },
    } as unknown as PrismaTransaction;
    const service = createService(tx);

    const result = await service.register(
      {
        deviceUuid: pendingDevice.deviceUuid,
        platform: DevicePlatform.ANDROID,
        deviceModel: 'Pixel',
        osVersion: '16',
        appVersion: '1.0.0',
        pushToken: 'private-push-token',
      },
      '127.0.0.1',
    );

    expect(result.data.status).toBe(DeviceStatus.PENDING_APPROVAL);
    expect(result.data).not.toHaveProperty('pushToken');
    expect(result.data).not.toHaveProperty('lastIp');
    expect(create).toHaveBeenCalledTimes(1);
    expect(auditAppend).toHaveBeenCalledTimes(1);
    expect(outboxAppend).toHaveBeenCalledTimes(1);
  });

  it('blocks a device and revokes every bound refresh session atomically', async () => {
    const blocked = {
      ...pendingDevice,
      status: DeviceStatus.BLOCKED,
      blockedBy: context.userId,
      blockedReason: 'Reported as lost',
    };
    const revoke = jest.fn().mockResolvedValue({ count: 2 });
    const tx = {
      registeredDevice: {
        findUnique: jest.fn().mockResolvedValue(pendingDevice),
        update: jest.fn().mockResolvedValue(blocked),
      },
      refreshToken: { updateMany: revoke },
    } as unknown as PrismaTransaction;
    const service = createService(tx);

    const result = await service.block(pendingDevice.id, 'Reported as lost');

    expect(result.data.status).toBe(DeviceStatus.BLOCKED);
    expect(revoke).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deviceId: pendingDevice.id, revokedAt: null },
      }),
    );
    expect(auditAppend).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ action: 'attendance.device.blocked' }),
    );
  });

  function createService(tx: PrismaTransaction) {
    const prisma = {
      forTenant: (callback: (transaction: PrismaTransaction) => unknown) =>
        callback(tx),
    } as unknown as PrismaService;
    return new DeviceTrustService(prisma, context, audit, outbox);
  }
});
