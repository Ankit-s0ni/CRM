import { HttpException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type {
  PrismaService,
  PrismaTransaction,
} from '../../../shared/database/prisma.service';
import type { TenantContextService } from '../../../platform/tenancy/public';
import type { AttendanceContextService } from '../core/application/attendance-context.service';
import { DeviceIntegrityChallengeService } from './device-integrity-challenge.service';

describe('DeviceIntegrityChallengeService', () => {
  it('issues a bounded challenge only for the active owned device', async () => {
    const create = jest.fn<Promise<{ id: string }>, [ChallengeCreateInput]>(
      () => Promise.resolve({ id: 'challenge-1' }),
    );
    const tx = {
      registeredDevice: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'device-1',
          employeeId: 'employee-1',
          status: 'ACTIVE',
          platform: 'ANDROID',
        }),
      },
      deviceIntegrityChallenge: { create },
    } as unknown as PrismaTransaction;
    const service = createService(tx);

    const response = await service.create({
      deviceUuid: '70000000-0000-4000-8000-000000000001',
      action: 'OFFLINE_PUNCH',
    });

    expect(response.data).toMatchObject({
      id: 'challenge-1',
      platform: 'ANDROID',
    });
    expect(response.data.nonce).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(response.data.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-1',
        employeeId: 'employee-1',
        deviceId: 'device-1',
        nonceHash: createHash('sha256')
          .update(response.data.nonce)
          .digest('base64url'),
        action: 'OFFLINE_PUNCH',
        expiresAt: response.data.expiresAt,
      },
      select: { id: true },
    });
  });

  it.each([
    [
      'consumed',
      new Date(),
      new Date(Date.now() + 60_000),
      'INTEGRITY_REPLAYED',
    ],
    [
      'expired',
      null,
      new Date(Date.now() - 60_000),
      'INTEGRITY_CHALLENGE_EXPIRED',
    ],
  ])('rejects a %s challenge', async (_name, consumedAt, expiresAt, code) => {
    const tx = {
      deviceIntegrityChallenge: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'challenge-1',
          nonceHash: 'hash',
          action: 'PUNCH',
          consumedAt,
          expiresAt,
        }),
      },
    } as unknown as PrismaTransaction;
    const service = createService(tx);

    await expectCode(
      service.resolve(tx, 'challenge-1', {
        tenantId: 'tenant-1',
        employeeId: 'employee-1',
        deviceId: 'device-1',
      }),
      code,
    );
  });

  it('atomically rejects a second consume', async () => {
    const tx = {
      deviceIntegrityChallenge: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    } as unknown as PrismaTransaction;
    const service = createService(tx);

    await expectCode(service.consume(tx, 'challenge-1'), 'INTEGRITY_REPLAYED');
  });

  it('deletes only challenges outside the configured retention buffer', async () => {
    const deleteMany = jest.fn().mockResolvedValue({ count: 3 });
    const tx = {
      deviceIntegrityChallenge: { deleteMany },
    } as unknown as PrismaTransaction;
    const service = createService(tx);
    const now = new Date('2026-07-18T12:00:00.000Z');

    await expect(service.cleanupExpired(now)).resolves.toEqual({ count: 3 });
    expect(deleteMany).toHaveBeenCalledWith({
      where: {
        expiresAt: { lt: new Date('2026-07-11T12:00:00.000Z') },
      },
    });
  });
});

function createService(tx: PrismaTransaction) {
  const prisma = {
    forTenant: jest.fn((handler: (value: PrismaTransaction) => unknown) =>
      handler(tx),
    ),
    forAdmin: jest.fn((handler: (value: PrismaTransaction) => unknown) =>
      handler(tx),
    ),
  } as unknown as PrismaService;
  const context = {
    tenantId: 'tenant-1',
    userId: 'user-1',
  } as TenantContextService;
  const attendanceContext = {
    employeeForUser: jest.fn().mockResolvedValue({ id: 'employee-1' }),
  } as unknown as AttendanceContextService;
  return new DeviceIntegrityChallengeService(
    prisma,
    context,
    attendanceContext,
  );
}

type ChallengeCreateInput = {
  data: {
    tenantId: string;
    employeeId: string;
    deviceId: string;
    nonceHash: string;
    action: string;
    expiresAt: Date;
  };
  select: { id: boolean };
};

async function expectCode(promise: Promise<unknown>, code: string) {
  try {
    await promise;
    throw new Error(`Expected ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(HttpException);
    const response = (error as HttpException).getResponse();
    expect(response).toEqual({
      code,
      message: 'Device integrity evidence is invalid or has already been used',
    });
  }
}
